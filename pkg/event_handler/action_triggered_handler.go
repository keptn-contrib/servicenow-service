package event_handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"

	cloudevents "github.com/cloudevents/sdk-go/v2"
	"github.com/keptn-contrib/servicenow-service/pkg/credentials"
	"github.com/keptn/go-utils/pkg/lib/keptn"
	keptnv2 "github.com/keptn/go-utils/pkg/lib/v0_2_0"
	"github.com/tidwall/gjson"
)

const ActionToggleFeature = "trigger-servicenow-flow"

type ActionTriggeredHandler struct {
	Logger keptn.LoggerInterface
	Event  cloudevents.Event
}

func (eh ActionTriggeredHandler) HandleEvent() error {
	var shkeptncontext string
	_ = eh.Event.Context.ExtensionAs("shkeptncontext", &shkeptncontext)

	actionTriggeredEvent := &keptnv2.ActionTriggeredEventData{}

	err := eh.Event.DataAs(actionTriggeredEvent)
	if err != nil {
		eh.Logger.Error("ServiceNow remediation action not well formed: " + err.Error())
		return errors.New("ServiceNow remediation action not well formed: " + err.Error())
	}

	if actionTriggeredEvent.Action.Action != ActionToggleFeature {
		eh.Logger.Info("Received unknown action: " + actionTriggeredEvent.Action.Action + ". Exiting")
		return nil
	}

	// Send action.started event
	if sendErr := eh.sendEvent(keptnv2.GetStartedEventType(keptnv2.ActionTaskName), eh.getActionStartedEvent(*actionTriggeredEvent)); sendErr != nil {
		eh.Logger.Error(sendErr.Error())
		return errors.New(sendErr.Error())
	}

	values, ok := actionTriggeredEvent.Action.Value.(map[string]interface{})

	if !ok {
		msg := "Could not parse action.value"
		eh.Logger.Error(msg)
		err = eh.sendEvent(keptnv2.GetFinishedEventType(keptnv2.ActionTaskName),
			eh.getActionFinishedEvent(keptnv2.ResultFailed, keptnv2.StatusErrored, *actionTriggeredEvent, msg))
		return errors.New(msg)
	}

	var flowApiPath string
	var httpMethod string
	var retries float64

	if val, ok := values["flowApiPath"]; ok {
		flowApiPath = val.(string)
	}

	if val, ok := values["retries"].(float64); ok {
		retries = float64(val)
	}

	if val, ok := values["httpMethod"]; ok {
		httpMethod = val.(string)
	}

	if flowApiPath == "" || httpMethod == "" {
		eh.Logger.Error("mandatory values missing")
		return err
	}

	err = triggerFlow(actionTriggeredEvent, flowApiPath, httpMethod, int(retries))
	if err != nil {
		msg := "Could not trigger " + flowApiPath + " " + err.Error()
		eh.Logger.Error(msg)
		sendErr := eh.sendEvent(keptnv2.GetFinishedEventType(keptnv2.ActionTaskName),
			eh.getActionFinishedEvent(keptnv2.ResultFailed, keptnv2.StatusErrored, *actionTriggeredEvent, msg))
		if sendErr != nil {
			eh.Logger.Error("could not send action-finished event: " + err.Error())
			return err
		}
		return err
	}

	err = eh.sendEvent(keptnv2.GetFinishedEventType(keptnv2.ActionTaskName),
		eh.getActionFinishedEvent(keptnv2.ResultPass, keptnv2.StatusSucceeded, *actionTriggeredEvent, ""))
	if err != nil {
		eh.Logger.Error("could not send action-finished event: " + err.Error())
		return err
	}
	return nil
}

func (eh ActionTriggeredHandler) getActionFinishedEvent(result keptnv2.ResultType, status keptnv2.StatusType, actionTriggeredEvent keptnv2.ActionTriggeredEventData, message string) keptnv2.ActionFinishedEventData {

	return keptnv2.ActionFinishedEventData{
		EventData: keptnv2.EventData{
			Project: actionTriggeredEvent.Project,
			Stage:   actionTriggeredEvent.Stage,
			Service: actionTriggeredEvent.Service,
			Labels:  actionTriggeredEvent.Labels,
			Status:  status,
			Result:  result,
			Message: message,
		},
		Action: keptnv2.ActionData{},
	}
}

func (eh ActionTriggeredHandler) getActionStartedEvent(actionTriggeredEvent keptnv2.ActionTriggeredEventData) keptnv2.ActionStartedEventData {

	return keptnv2.ActionStartedEventData{
		EventData: keptnv2.EventData{
			Project: actionTriggeredEvent.Project,
			Service: actionTriggeredEvent.Service,
			Stage:   actionTriggeredEvent.Stage,
			Labels:  actionTriggeredEvent.Labels,
		},
	}
}

func (eh ActionTriggeredHandler) sendEvent(eventType string, data interface{}) error {
	keptnHandler, err := keptnv2.NewKeptn(&eh.Event, keptn.KeptnOpts{})

	if err != nil {
		return errors.New("Failed to initialize Keptn handler: " + err.Error())
	}

	source, _ := url.Parse("servicenow-service")

	event := cloudevents.NewEvent()
	event.SetType(eventType)
	event.SetSource(source.String())
	event.SetDataContentType(cloudevents.ApplicationJSON)
	event.SetExtension("shkeptncontext", keptnHandler.KeptnContext)
	event.SetExtension("triggeredid", eh.Event.ID())
	event.SetData(cloudevents.ApplicationJSON, data)

	err = keptnHandler.SendCloudEvent(event)

	if err != nil {
		eh.Logger.Error("Could not send " + eventType + " event: " + err.Error())
		return err
	}

	return nil
}

// ToggleFeature sets a value for a feature flag
func triggerFlow(actionEvent *keptnv2.ActionTriggeredEventData, flowApiPath string, httpMethod string, retries int) error {

	if retries == 0 {
		retries = 10
	}

	creds, err := credentials.GetServicenowCredentials()
	if err != nil {
		return fmt.Errorf("failed to load ServiceNow credentials: %v", err)
	}

	snowRawInstanceURL := creds.Instance
	parsedSnowURL, err := url.Parse(snowRawInstanceURL)
	if err != nil {
		return err
	}
	snowInstanceURL := parsedSnowURL.Scheme + "://" + parsedSnowURL.Host
	snowUser := creds.User
	snowPassword := creds.Password
	snowTriggerFlowAPIURL := snowInstanceURL + flowApiPath
	flowPayload, err := json.Marshal(actionEvent)
	if err != nil {
		return err
	}

	// Trigger flow
	resp, body, err := executeServiceNowRequest(httpMethod, snowTriggerFlowAPIURL, snowUser, snowPassword, flowPayload)

	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Flow API request failed with status %s and response %s, error: %s", resp.Status, string(body), err)
	}

	value := gjson.Get(string(body), "result.executionId")
	flowContextExecID := value.String()

	// Wait for flow execution to finish
	err = waitForFlowExecution(snowInstanceURL, flowContextExecID, snowUser, snowPassword, retries)

	return nil
}

func waitForFlowExecution(snowInstanceURL string, flowContextExecID string, snowUser string, snowPassword string, retries int) error {

	snowFlowContextAPIURL := snowInstanceURL + "/api/now/table/sys_flow_context?sysparm_limit=1&execution_id=" + flowContextExecID

	for retries > 0 {

		resp, body, err := executeServiceNowRequest("GET", snowFlowContextAPIURL, snowUser, snowPassword, nil)

		if err != nil {
			return err
		}

		if resp == nil {
			return fmt.Errorf("No valid response from Flow execution status: %s", snowFlowContextAPIURL)
		}

		value := gjson.Get(string(body), "result.0.state")
		flowState := value.String()

		if flowState == "WAITING" || flowState == "IN_PROGRESS" || flowState == "QUEUED" || flowState == "CONTINUE_SYNC	" {
			fmt.Println("Flow State: " + flowState)
			fmt.Printf("Flow execution not yet complete sleeping 10 seconds before retry, %v retries left\n", retries)
			time.Sleep(30 * time.Second)
			retries -= 1
		} else if flowState == "ERROR" || flowState == "CANCELLED" {
			return fmt.Errorf("Flow execution completed with failure, response code %s. State value from API call: %s", resp.Status, string(body))
		} else if flowState == "COMPLETE" {
			fmt.Println("Flow execution completed, state value from API: " + flowState)
			return nil
		} else {
			return fmt.Errorf("Flow execution completed with failure")
		}

	}

	return nil

}

func executeServiceNowRequest(httpMethod string, snowAPIURL string, snowUser string, snowPassword string, flowPayload []byte) (*http.Response, []byte, error) {

	var req *http.Request
	var err error

	client := &http.Client{}
	if flowPayload != nil {
		req, err = http.NewRequest(httpMethod, snowAPIURL, bytes.NewReader(flowPayload))
	} else {
		req, err = http.NewRequest(httpMethod, snowAPIURL, nil)
	}

	// add basic auth
	req.SetBasicAuth(snowUser, snowPassword)

	// execute the HTTP request
	resp, err := client.Do(req)
	if err != nil {
		return resp, nil, err
	}

	if resp == nil {
		return resp, nil, fmt.Errorf("No valid response from flow api: %s", snowAPIURL)
	}

	defer resp.Body.Close()

	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return resp, nil, err
	}

	return resp, responseBody, nil

}

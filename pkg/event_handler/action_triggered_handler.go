package event_handler

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/cloudevents/sdk-go/pkg/cloudevents/types"
	"github.com/google/uuid"
	"github.com/keptn-contrib/servicenow-service/pkg/credentials"
	keptn "github.com/keptn/go-utils/pkg/lib"
)

type flowStatus struct {
	Result *Result `json:"result"`
}

type Result struct {
	FlowStatus *FlowStatus `json:"flowStatus"`
}

type FlowStatus struct {
	ExitStatus string `json:"exit_status"`
}

const ActionToggleFeature = "trigger-flowAPI"

type ActionTriggeredHandler struct {
	Logger keptn.LoggerInterface
	Event  cloudevents.Event
}

func (eh ActionTriggeredHandler) HandleEvent() error {
	var shkeptncontext string
	_ = eh.Event.Context.ExtensionAs("shkeptncontext", &shkeptncontext)

	actionTriggeredEvent := &keptn.ActionTriggeredEventData{}

	err := eh.Event.DataAs(actionTriggeredEvent)
	if err != nil {
		eh.Logger.Error("ServiceNow remediation action not well formed: " + err.Error())
		return errors.New("ServiceNowremediation action not well formed: " + err.Error())
	}

	if actionTriggeredEvent.Action.Action != ActionToggleFeature {
		eh.Logger.Info("Received unknown action: " + actionTriggeredEvent.Action.Action + ". Exiting")
		return nil
	}

	// Send action.started event
	if sendErr := eh.sendEvent(keptn.ActionStartedEventType, eh.getActionStartedEvent(*actionTriggeredEvent)); sendErr != nil {
		eh.Logger.Error(sendErr.Error())
		return errors.New(sendErr.Error())
	}

	values, ok := actionTriggeredEvent.Action.Value.(map[string]interface{})

	if !ok {
		eh.Logger.Error("Could not parse action.value/missing mandatory values")
		err = eh.sendEvent(keptn.ActionFinishedEventType,
			eh.getActionFinishedEvent(keptn.ActionResultPass, keptn.ActionStatusErrored, *actionTriggeredEvent))
		return errors.New("Could not parse action.value/missing mandatory values")
	}

	var flowType string
	var name string

	if val, ok := values["FlowType"]; ok {
		flowType = val.(string)
	}

	if val, ok := values["Name"]; ok {
		name = val.(string)
	}

	if flowType == "" || name == "" {
		return fmt.Errorf("mandatory values missing")
	}

	err = triggerFlowAPI(actionTriggeredEvent, name, flowType)
	if err != nil {
		eh.Logger.Error("Could not trigger " + flowType + " " + name + err.Error())
		sendErr := eh.sendEvent(keptn.ActionFinishedEventType,
			eh.getActionFinishedEvent(keptn.ActionResultPass, keptn.ActionStatusErrored, *actionTriggeredEvent))
		if sendErr != nil {
			eh.Logger.Error("could not send action-finished event: " + err.Error())
			return err
		}
		return err
	}

	err = eh.sendEvent(keptn.ActionFinishedEventType,
		eh.getActionFinishedEvent(keptn.ActionResultPass, keptn.ActionStatusSucceeded, *actionTriggeredEvent))
	if err != nil {
		eh.Logger.Error("could not send action-finished event: " + err.Error())
		return err
	}
	return nil
}

func (eh ActionTriggeredHandler) getActionFinishedEvent(result keptn.ActionResultType, status keptn.ActionStatusType,
	actionTriggeredEvent keptn.ActionTriggeredEventData) keptn.ActionFinishedEventData {

	return keptn.ActionFinishedEventData{
		Project: actionTriggeredEvent.Project,
		Service: actionTriggeredEvent.Service,
		Stage:   actionTriggeredEvent.Stage,
		Action: keptn.ActionResult{
			Result: result,
			Status: status,
		},
		Labels: actionTriggeredEvent.Labels,
	}
}

func (eh ActionTriggeredHandler) getActionStartedEvent(actionTriggeredEvent keptn.ActionTriggeredEventData) keptn.ActionStartedEventData {

	return keptn.ActionStartedEventData{
		Project: actionTriggeredEvent.Project,
		Service: actionTriggeredEvent.Service,
		Stage:   actionTriggeredEvent.Stage,
		Labels:  actionTriggeredEvent.Labels,
	}
}

func (eh ActionTriggeredHandler) sendEvent(eventType string, data interface{}) error {
	keptnHandler, err := keptn.NewKeptn(&eh.Event, keptn.KeptnOpts{
		EventBrokerURL: os.Getenv("EVENTBROKER"),
	})
	if err != nil {
		eh.Logger.Error("Could not initialize Keptn handler: " + err.Error())
		return err
	}

	source, _ := url.Parse("servicenow-service")
	contentType := "application/json"

	event := cloudevents.Event{
		Context: cloudevents.EventContextV02{
			ID:          uuid.New().String(),
			Time:        &types.Timestamp{Time: time.Now()},
			Type:        eventType,
			Source:      types.URLRef{URL: *source},
			ContentType: &contentType,
			Extensions:  map[string]interface{}{"shkeptncontext": keptnHandler.KeptnContext, "triggeredid": eh.Event.ID()},
		}.AsV02(),
		Data: data,
	}

	err = keptnHandler.SendCloudEvent(event)
	if err != nil {
		eh.Logger.Error("Could not send " + eventType + " event: " + err.Error())
		return err
	}
	return nil
}

// ToggleFeature sets a value for a feature flag
func triggerFlowAPI(actionEvent *keptn.ActionTriggeredEventData, name string, flowType string) error {

	creds, err := credentials.GetServicenowCredentials()
	if err != nil {
		return fmt.Errorf("failed to load ServiceNow credentials: %v", err)
	}

	snowAPIURL := creds.Instance
	snowUser := creds.User
	snowPassword := creds.Password
	method := "POST"

	flowPayload, err := json.Marshal(actionEvent)
	if err != nil {
		fmt.Println(err)
	}

	client := &http.Client{}
	req, err := http.NewRequest(method, snowAPIURL, bytes.NewReader(flowPayload))
	if err != nil {
		return err
	}

	req.SetBasicAuth(snowUser, snowPassword)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	fmt.Println("ServiceNow status code: " + strconv.Itoa(resp.StatusCode))

	defer resp.Body.Close()
	responseBody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %v", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("api request failed with status %s and response %s", resp.Status, string(responseBody))
	}

	var flowResult flowStatus
	err = json.Unmarshal(responseBody, &flowResult)
	if err != nil {
		return err
	}

	if flowResult.Result.FlowStatus.ExitStatus == "failure" {
		return fmt.Errorf("failure executing %s %s with status %s and response %s", flowType, name, resp.Status, string(responseBody))

	}

	return nil
}

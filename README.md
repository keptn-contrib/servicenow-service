# ServiceNow keptn service

This service allows to interact with the ServiceNow Integration Hub. Triggered by a Keptn CloudEvent of the type `sh.keptn.event.action.triggered`. After the features specified in the event have been toggled, it sends out an `sh.keptn.event.action`.finished event.

Whenever a remediaton action of type `trigger-flowAPI` is triggered by keptn, the `servicenow-service` will receive a keptn event of type `sh.keptn.event.action.triggered`. Based on the remediation configuration, the service can trigger any ServiceNow `subflow` or `action` with an arbitrary set of values which will be passed on to the ServiceNow API endpoint along with the `sh.keptn.event.action.triggered` event payload.

Example of an action triggered event:

```json
{
    "type": "sh.keptn.event.action.triggered",
    "specversion": "0.2",
    "source": "https://github.com/keptn/keptn/remediation-service",
    "id": "f2b878d3-03c0-4e8f-bc3f-454bc1b3d79d",
    "time": "2019-06-07T07:02:15.64489Z",
    "contenttype": "application/json",
    "shkeptncontext": "08735340-6f9e-4b32-97ff-3b6c292bc509",
    "data": {
        "action": {
            "name": "Trigger ServiceNow Flow",
            "action": "trigger-flowAPI",
            "description": "Runs a ServiceNow subflow/action",
            "value": {
                "FlowType": "action",
                "Name": "restart_win_service",
                "Scope": "global",
            }
        },
        "problem": {
            "ImpactedEntity": "carts-primary",
            "PID": "93a5-3fas-a09d-8ckf",
            "ProblemDetails": "Process name",
            "ProblemID": "762",
            "ProblemTitle": "cpu_usage_sockshop_carts",
            "State": "OPEN"
        },
        "project": "sockshop",
        "service": "carts",
        "stage": "staging",
        "labels": {
            "testId": "4711",
            "buildId": "build-17",
            "owner": "JohnDoe"
        }
    }
}
```

Remediation Config Example:

```yaml
apiVersion: spec.keptn.sh/0.1.4
kind: Remediation
metadata:
  name: carts-remediation
spec:
  remediations:
    - problemType: High CPU Usage
      actionsOnOpen:
        - action: trigger-flowAPI
          name: Trigger ServiceNow Flow
          description: Restarts a windows process
          value:
            FlowType: action # mandatory parameter
            Name: restart_win_service # mandatory parameter
```

## Compatibility Matrix

Please always double check the version of Keptn you are using compared to the version of this service, and follow the compatibility matrix below.

| Keptn Version    | [ServiceNow Service Image](https://hub.docker.com/r/keptn/servicenow-service/tags) |
|:----------------:|:----------------------------------------:|
|       0.4.x      | keptn/servicenow-service:0.1.3  |
|       0.5.x      | keptn/servicenow-service:0.1.4  |
|       0.6.x      | keptn/servicenow-service:0.2.0  |
|       0.7.2      | keptn/servicenow-service:0.2.1  |
|       0.7.x      | keptn/servicenow-service:0.3.0  |

## Installation

### Create ServiceNow secret

- Create a ServiceNow kubernetes secret to allow the ServiceNow keptn service to create events and update alerts in ServiceNow.

- Export the ServiceNow API URL, ServiceNow user and ServiceNow password as environmnet variables:

```bash
export SERVICENOW_API_URL="your_flow_api_url"
export SERVICENOW_USER="your_servicenow_user"
export SERVICENOW_PASSWORD="your_servicenow_password"
```

- Run the following command to create the `servicenow` secret:

```bash
kubectl -n keptn create secret generic servicenow --from-literal="SERVICENOW_INSTANCE=$SERVICENOW_API_URL" --from-literal="SERVICENOW_USER=$SERVICENOW_USER" --from-literal="SERVICENOW_PASSWORD=$SERVICENOW_PASSWORD"
```

**Note:** The ServiceNow user needs to have the role(s) that matches with the created scripted rest api endpoint.

### Install the ServiceNow service on the keptn namespace

- Subscribe the servicenow-service to keptn sh.keptn.event.problem.open events by applying the distributor manifest:

- Deploy the servicenow-service by running the following command:

```
kubectl -n keptn apply -f https://github.com/keptn-contrib/servicenow-service/blob/$version/deploy/service.yaml
```

After running these commands, the `servicenow-service` and distributor are now deployed in your cluster. Execute the following commands to verify the deployment of the servicenow-service.

```bash
kubectl get svc servicenow-service -n keptn
```

```bash
NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
servicenow-service   ClusterIP   10.51.246.134   <none>        8080/TCP   18m
```

```bash
kubectl get po -n keptn | grep "servicenow"
```

```bash
NAME                                                              READY   STATUS    RESTARTS   AGE
servicenow-service-5b67cc545c-c2452                               2/2     Running   0          17m
```

### Delete the ServiceNow service on the keptn namespace

To delete a deployed servicenow-service and distributor, use the file deploy/service.yaml from this repository and delete the Kubernetes resources:

```
kubectl -n keptn delete -f https://github.com/keptn-contrib/servicenow-service/blob/$version/deploy/service.yaml
```

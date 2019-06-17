#!/bin/bash
# env variables
export DT_TENANT=$(kubectl get secret dynatrace -n keptn -o=yaml | yq - r data.DT_TENANT | base64 --decode)
export DT_API_TOKEN=$(kubectl get secret dynatrace -n keptn -o=yaml | yq - r data.DT_API_TOKEN | base64 --decode)
export keptn_eventBroker=$(kubectl get ksvc event-broker-ext -n keptn -ojsonpath={.status.domain})
export CLUSTERVERSION=$(curl -s https://$DT_TENANT/api/v1/config/clusterversion?api-token=$DT_API_TOKEN | jq -r .version[0:5])
export Bearer=$(kubectl get secret keptn-api-token -n keptn -o=yaml | yq - r data.keptn-api-token | base64 --decode)

# Check tenant is at least 1.169
if (( $(echo "$CLUSTERVERSION > 1.168" | bc -l) ))
then
curl -X POST \
  "https://$DT_TENANT/api/config/v1/notifications?api-token=$DT_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{
  "type": "WEBHOOK",
  "name": "Keptn Event Broker",
    "alertingProfile": "c21f969b-5f03-333d-83e0-4f8f136e7682",
  "active": true,
  "url": "https://'$keptn_eventBroker'/dynatrace",
  "acceptAnyCertificate": true,
  "payload": "{\n    \"specversion\":\"0.2\",\n    \"type\":\"sh.keptn.events.problem\",\n    \"shkeptncontext\":\"{PID}\",\n    \"source\":\"dynatrace\",\n    \"id\":\"{PID}\",\n    \"time\":\"\",\n    \"datacontenttype\":\"application/json\",\n    \"data\": {\n        \"State\":\"{State}\",\n        \"ProblemID\":\"{ProblemID}\",\n        \"PID\":\"{PID}\",\n        \"ProblemTitle\":\"{ProblemTitle}\",\n        \"ProblemDetails\":{ProblemDetailsJSON},\n        \"ImpactedEntities\":{ImpactedEntities},\n        \"ImpactedEntity\":\"{ImpactedEntity}\"\n    }\n}",
  "headers": [
    {
      "name": "Authorization",
      "value": "Bearer '$Bearer'"
    }
  ]
}'
else
echo "Cluster must be 1.69 or above, detected cluster version was $CLUSTERVERSION. Please configure notification manually"
fi

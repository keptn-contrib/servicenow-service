#!/bin/sh
REGISTRY_URI=$(kubectl describe svc docker-registry -n keptn | grep IP: | sed 's~IP:[ \t]*~~')

rm -f config/gen/servicenow-operator.yaml

cat config/servicenow-operator.yaml | \
  sed 's~REGISTRY_URI_PLACEHOLDER~'"$REGISTRY_URI"'~' >> config/gen/servicenow-operator.yaml 

kubectl delete -f config/gen/servicenow-operator.yaml

kubectl apply -f config/gen/servicenow-operator.yaml
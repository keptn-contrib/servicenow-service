#!/bin/sh
REGISTRY_URL=$(kubectl describe svc docker-registry -n cicd | grep IP: | sed 's~IP:[ \t]*~~')
CHANNEL_URI=$1

rm -f config/gen/servicenow-operator.yaml

cat config/servicenow-operator.yaml | \
  sed 's~CHANNEL_URI_PLACEHOLDER~'"$CHANNEL_URI"'~' | \
  sed 's~REGISTRY_URI_PLACEHOLDER~'"$REGISTRY_URI"'~' >> config/gen/servicenow-operator.yaml 
  
kubectl apply -f config/gen/servicenow-operator.yaml
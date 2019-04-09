#!/bin/sh
REGISTRY_URI=$(kubectl describe svc docker-registry -n keptn | grep IP: | sed 's~IP:[ \t]*~~')

rm -f config/gen/servicenow-service-build.yaml

cat config/servicenow-service-build.yaml | \
  sed 's~REGISTRY_URI_PLACEHOLDER~'"$REGISTRY_URI"'~' >> config/gen/servicenow-service-build.yaml 

kubectl delete -f config/gen/servicenow-service-build.yaml --ignore-not-found

kubectl apply -f config/gen/servicenow-service-build.yaml

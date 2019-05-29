#!/bin/sh

kubectl delete -f config/servicenow-service.yaml --ignore-not-found
kubectl apply -f config/servicenow-service.yaml

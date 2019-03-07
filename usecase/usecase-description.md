# ServiceNow Service

## Prerequisites
- ServiceNow instance: you can get a ServiceNow developer instance for free here: https://developer.servicenow.com 

## Installation of workflow in ServiceNow

1. TODO


## Start the use case

1. have the `carts` service deployed
1. get the public ip of the carts service in your namespace `kubectl get svc -n NAMESPACE`
1. start the load generator `add-to-carts.sh http://IP-OF-CARTS-SERVICE` 
1. start the promotional campaign with the script `enable-promotion.sh` and set promotional rate to 30
1. wait for Dynatrace to detect a problem, this will take approximately 5 minutes
  
    - in the meantime, explore the service in Dynatrace and look for the configuration change event that has been attached to the service. this event holds information that the remediation provider is servicenow and a description of the remediation action.

1. after ~5 minutes the problem is created and a problem notification is sent to the keptn event-broker. 
1. the event-broker takes the payload, wraps it into a cloudevent and pushes is into the problem channel.
1. the servicenow-service is subscribed to this channel, consumes this event and creates an incident in servicenow.
1. a workflow is assigned to new incidents and starts the remediation.

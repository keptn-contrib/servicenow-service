# ServiceNow Service

## Prerequisites
- ServiceNow instance: you can get a ServiceNow developer instance for free here: https://developer.servicenow.com 

## Installation of workflow in ServiceNow

1. 


## Start the use case

1. have the `carts` service deployed
1. get the public ip of the carts service in your namespace `kubectl get svc -n NAMESPACE`
1. start the load generator `add-to-carts.sh http://IP-OF-CARTS-SERVICE` 
1. start the promotional campaign with the script `enable-promotion.sh` 
1. 


# Runbook Automation

Gives an overview of how to leverage the power of runbook automation to build self-healing applications. This tutorial uses ServiceNow workflows that trigger when alerts from Keptn are generated.

## About this tutorial

Configuration changes during runtime are sometimes necessary to increase flexibility. A prominent example are feature flags that can be toggled also in a production environment. In this tutorial, we will change the promotion rate of a shopping cart service, which means that a defined percentage of interactions with the shopping cart will add promotional items (e.g., small gifts) to the shopping carts of our customers. However, we will experience issues with this configuration change. Therefore, we will set logic in place that is capable of auto-remediating issues at runtime via ServiceNow workflows.

## Prerequisites

- Finish the Onboarding a Service tutorial.
***Note:*** For this tutorial, the Onboarding a Service tutorial has to be completed exactly as it is described. The scripts provided in the current tutorial rely on values that are set during the onboarding of the carts service. Thus, this tutorial might not work as expected if values are changed.
- ServiceNow instance or free ServiceNow developer instance.
***Note:*** Tutorial tested on Madrid and New York releases.
- Event Management plugin (com.glideapp.itom.snac) needs to be enabled on ServiceNow instance.
***Note:*** To enable a plugin on a developer ServiceNow instance, visit the [Developer Portal] then go to `MANAGE -> instance` and click on the `Action` button and select `Activate plugin`. From the available plugins list click on `ACTIVATE` next to Event Management and then select `Activate plugin only`. The process will take a few minutes to complete.
- Setup of Dynatrace for monitoring is mandatory
- Clone the GitHub repository with the necessary files for the tutorial:

```
git clone --branch 0.2.0 https://github.com/keptn-contrib/servicenow-service.git --single-branch
cd servicenow-service
```

## Create ServiceNow secret

- Create a ServiceNow kubernetes secret to allow the servicenow Keptn service to create/update events in ServiceNow and run workflows. 

- Create a file as shown below that contains your ServiceNow credentials and save it in your current directory as cred_file.yaml:

```
SERVICENOW_INSTANCE: {instance_id}.service-now.com
SERVICENOW_USER: your_servicenow_user
SERVICENOW_PASSWORD: your_servicenow_password
```

***Note:***: ServiceNow user needs to have the evt_mgmt_integration or admin role(s) assigned to it.

 - Run the command below to create the ServiceNow secret:

```
kubectl create secret generic servicenow -n keptn --from-file=servicenow-credentials=cred_file.yaml
```

## Install the ServiceNow service on the keptn namespace

- Subscribe the servicenow-service to Keptn sh.keptn.event.problem.open events by applying the distributor manifest:

```
cd deploy
kubectl apply -f distributor.yaml
```

  - Deploy the servicenow-service by running the following command:

```
kubectl apply -f service.yaml
```

[Developer Portal]: https://developer.servicenow.com/
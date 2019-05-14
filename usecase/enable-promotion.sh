#!/bin/bash

echo "Usage: ./enable-promotion.sh http://XX.XX.XX.XX/ 30"

if [ -z $1 ]
then
  echo "Please provide the url of the carts service in production as parameter."
  echo ""
  echo "Usage: ./enable-promotion.sh http://XX.XX.XX.XX/ 30"
  exit 1
fi

if [ -z $2 ]
then
  echo "Please provide the percent as second parameter."
  echo ""
  echo "Usage: ./enable-promotion.sh http://XX.XX.XX.XX/ 30"
  exit 1
fi

if [ -z $DT_TENANT ]
then
  echo "DT_TENANT not set. Please set environment variable accordingly."
  exit 1
fi

if [ -z $DT_API_TOKEN ]
then
  echo "DT_API_TOKEN not set. Please set environment variable accordingly."
  exit 1
fi

url=$1
percent=$2

echo "Pushing deployment event to Dynatrace"

curl -X POST \
  "https://$DT_TENANT/api/v1/events?api-token=$DT_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'cache-control: no-cache' \
  -d '{
        "eventType": "CUSTOM_CONFIGURATION",
        "attachRules": {
          "tagRule" : {
            "meTypes" : ["SERVICE"],
            "tags" : [ 
              {"context": "ENVIRONMENT", "key": "application", "value": "sockshop"},
              {"context": "CONTEXTLESS", "key": "service", "value": "carts"},
              {"context": "CONTEXTLESS", "key": "environment", "value": "sockshop-production"}
            ]
          }
        },
        "description" : "Changed Promotion percentage",
        "configuration":"Promotion Percentage",
        "changed": '$percent',
        "source" : "Script",
        "customProperties":{
          "RemediationAction": "Disable Promotion in case of errors!",
          "RemediationUrl": "'$url'/carts/1/items/promotion/0",
          "RemediationProvider": "service-now.com",
          "Approver": "luke.wilson@example.com",
          "Comment": "Testing out the new promotion feature of Carts"
        }
     }'
echo ""

echo "Turning promotion to $percent %..."
curl -X GET $url/carts/1/items/promotion/$percent

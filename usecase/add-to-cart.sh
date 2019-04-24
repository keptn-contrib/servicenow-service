#!/bin/bash
echo "Usage: ./add-to-cart.sh http://XX.XX.XX.XX"
echo "Press [CTRL+C] to stop."

if [ -z $1 ]
then
    echo "Please provide the url as parameter"
    echo ""
    echo "Usage: ./add-to-cart.sh http://XX.XX.XX.XX"
    exit 1
fi

url=$1

i=0
while true
do
  echo ""
  echo "adding item to cart..."
  curl -X POST -H "Content-Type: application/json" -d "{\"itemId\":\"03fef6ac-1896-4ce8-bd69-b798f85c6e0b\", \"unitPrice\":\"99.99\"}" $url/carts/1/items
  i=$((i+1))
  if [ $i -ge 100 ]
  then
    curl -X DELETE $url/carts/1
    i=0
  fi
done

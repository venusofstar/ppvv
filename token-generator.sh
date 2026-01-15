#!/bin/bash

SECRET="my_secret_key"
STREAM="indianapacers.m3u8"
CLIENT_IP="1.2.3.4"          # user IP
EXPIRES=$(($(date +%s) + 21600)) # 6 hours

TOKEN=$(echo -n "${EXPIRES}${STREAM}${CLIENT_IP} ${SECRET}" \
  | openssl md5 -binary \
  | openssl base64 \
  | tr '+/' '-_' | tr -d '=')

echo "http://YOUR-IP:8080/secure/${TOKEN}/${EXPIRES}/${STREAM}"

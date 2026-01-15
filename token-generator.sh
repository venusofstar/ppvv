#!/bin/bash

SECRET="my_secret_key"
STREAM="indianapacers.m3u8"
USER_IP="1.2.3.4"

START=$(date +%s)
END=$((START + 21600)) # 6 hours

TOKEN=$(echo -n "${END}${STREAM}${USER_IP} ${SECRET}" \
 | openssl md5 -binary \
 | openssl base64 \
 | tr '+/' '-_' | tr -d '=')

echo "https://strm.example.com/secure/${TOKEN}/${START}/${END}/${STREAM}"

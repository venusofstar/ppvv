FROM nginx:alpine

RUN apk add --no-cache bash

COPY nginx.conf /etc/nginx/nginx.conf

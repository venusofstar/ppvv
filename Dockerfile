FROM nginx:alpine
RUN apk add --no-cache openssl bash
COPY nginx.conf /etc/nginx/nginx.conf

FROM node:16-alpine AS build
RUN apk add --no-cache git
RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app
USER app
WORKDIR /home/app
ENV NEXT_TELEMETRY_DISABLED 1 \
  NODE_ENV production
RUN git clone --branch temp --depth 1 https://github.com/paescuj/chat-window.git . \
  && npm install \
  && npm run deploy

FROM caddy:2 AS production
RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app
USER app
WORKDIR /home/app
COPY --from=build --chown=app:app /home/app/out .
COPY ./Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080

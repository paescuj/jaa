### Builder
FROM node:16-alpine AS build

RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app

USER app
WORKDIR /home/app
COPY --chown=app:app hooks src

# See https://github.com/rollup/rollup/issues/3805
RUN mkdir out && \
  for dir in src/*; do \
  cd "$dir" \
  && npm install \
  && npm install @rollup/plugin-commonjs@latest --prefix node_modules/@directus/extensions-sdk \
  && npm run build \
  && mv dist ../../out/$(basename "$dir") \
  && cd ../.. \
  ; done

### Directus
FROM directus/directus:9.14.1

USER root
RUN apk upgrade --no-cache \
  && apk --no-cache add \
  graphicsmagick \
  ghostscript \
  chromium \
  ca-certificates \
  ttf-freefont
USER node
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --chown=node:node --from=build /home/app/out extensions/hooks
COPY --chown=node:node snapshot.yaml snapshot.yaml
COPY --chown=node:node migrations extensions/migrations

CMD npx directus database install \
  && npx directus database migrate:latest \
  && role=$(npx directus roles create --role Administrator --admin true | grep -v '✨') \
  && password=${ADMIN_PASSWORD_FILE:+$(cat "$ADMIN_PASSWORD_FILE")} \
  && password=${password:-$ADMIN_PASSWORD} \
  && npx directus users create --email "$ADMIN_EMAIL" --password "$password" --role "$role" > /dev/null \
  && echo "$(date +%T) ✨ Admin user created successfully" \
  || npx directus database migrate:latest \
  && npx directus schema apply -y snapshot.yaml \
  && npx directus start

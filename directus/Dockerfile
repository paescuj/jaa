### Builder
FROM node:18-alpine AS builder

WORKDIR /builder

COPY extension/package.json .
RUN npm install

COPY extension .
RUN npm run build

### Directus
FROM directus/directus:10.5.2

USER root
RUN apk --no-cache add \
  graphicsmagick \
  ghostscript \
  chromium \
  ca-certificates \
  ttf-freefont

USER node
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN mkdir extensions/directus-extension-jaa
COPY --chown=node:node --from=builder /builder/package.json extensions/directus-extension-jaa
COPY --chown=node:node --from=builder /builder/dist extensions/directus-extension-jaa/dist
COPY --chown=node:node snapshot.yaml snapshot.yaml
COPY --chown=node:node migrations extensions/migrations

CMD node /directus/cli.js database install \
  && node /directus/cli.js database migrate:latest \
  && role=$(LOG_LEVEL=silent node /directus/cli.js roles create --role Administrator --admin true) \
  && password=${ADMIN_PASSWORD_FILE:+$(cat "$ADMIN_PASSWORD_FILE")} \
  && password=${password:-$ADMIN_PASSWORD} \
  && node /directus/cli.js users create --email "$ADMIN_EMAIL" --password "$password" --role "$role" > /dev/null \
  && echo "$(date +%T) ✨ Admin user created successfully" \
  || node /directus/cli.js database migrate:latest \
  && node /directus/cli.js schema apply -y snapshot.yaml \
  && node /directus/cli.js start

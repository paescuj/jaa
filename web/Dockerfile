# syntax=docker/dockerfile:1.4

### Builder
FROM node:18-alpine AS builder
WORKDIR /builder

RUN corepack enable

COPY package.json pnpm-lock.yaml .
RUN pnpm fetch --prod

COPY pnpm-workspace.yaml .
COPY web web
RUN pnpm install --recursive --offline --prod

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web run build

### Production
FROM node:18-alpine AS production

RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app
USER app
WORKDIR /home/app

COPY --from=builder --chown=app:app /builder/web/public web/public
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=app:app /builder/web/.next/standalone .
COPY --from=builder --chown=app:app /builder/web/.next/static web/.next/static

USER root
RUN npm install --global @beam-australia/react-env@$(node -e 'console.log(require("./web/package.json").dependencies["@beam-australia/react-env"])')
USER app

ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD react-env --prefix NEXT_PUBLIC --path web/.env.production --dest web/public && node web/server.js

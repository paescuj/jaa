### Builder
FROM node:16-alpine AS build

RUN apk upgrade --no-cache \
  && npm install -g pnpm
RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app
USER app
WORKDIR /home/app
COPY --chown=app:app package.json pnpm-lock.yaml pnpm-workspace.yaml .
RUN pnpm --frozen-lockfile install \
  && pnpm --filter web install sharp
COPY --chown=app:app web web
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web run build

### Production
FROM node:16-alpine AS production

RUN apk upgrade --no-cache
RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app
USER app
WORKDIR /home/app

COPY --from=build --chown=app:app /home/app/web/public public
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=build --chown=app:app /home/app/web/.next/standalone ./
COPY --from=build --chown=app:app /home/app/web/.next/static ./.next/static

ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["node", "server.js"]

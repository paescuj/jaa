FROM node:alpine AS build
RUN apk upgrade --no-cache \
  && apk --no-cache add \
  python3 \
  pkgconf \
  pixman-dev \
  cairo-dev \
  pango-dev \
  build-base
RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app
USER app
WORKDIR /home/app
COPY --chown=app:app package*.json .
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install
COPY --chown=app:app . .
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1
ARG PUBLIC_DOMAIN
RUN npm run build \
 && npm prune

FROM node:alpine AS production
RUN apk upgrade --no-cache \
 && apk --no-cache add \
 cairo \
 pango \
 chromium \
 nss \
 freetype \
 harfbuzz \
 ca-certificates \
 ttf-freefont
RUN addgroup -g 1001 app \
  && adduser -u 1001 -G app -s /bin/sh -D app
USER app
WORKDIR /home/app
COPY --chown=app:app --from=build /home/app/package*.json .
COPY --chown=app:app --from=build /home/app/node_modules node_modules
COPY --chown=app:app --from=build /home/app/next.config.js .
COPY --chown=app:app --from=build /home/app/.next .next
COPY --chown=app:app --from=build /home/app/public public
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
EXPOSE 3000
CMD [ "npm", "start" ]

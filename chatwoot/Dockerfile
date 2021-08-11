# Switch back as soon as new version has been released with ruby 3
# and https://github.com/chatwoot/chatwoot/pull/2779 merged
# FROM chatwoot/chatwoot:v1.18.2
FROM paescuj/chatwoot:latest

COPY ./patch/*.patch /patch/

RUN apk add --no-cache --virtual .builddeps git patch nodejs yarn \
  && for patch in /patch/*.patch; do patch -p1 < "$patch"; done \
  && SECRET_KEY_BASE=precompile_placeholder RAILS_LOG_TO_STDOUT=enabled bundle exec rake assets:precompile \
  && rm -rf /patch /tmp/* spec node_modules tmp/cache \
  && apk del .builddeps

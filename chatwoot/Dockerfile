FROM chatwoot/chatwoot:v1.21.0

COPY ./patches/*.patch /patches/

RUN apk add --no-cache --virtual .builddeps git patch nodejs yarn \
  && for patch in /patches/*.patch; do patch -p1 < "$patch"; done \
  && SECRET_KEY_BASE=precompile_placeholder RAILS_LOG_TO_STDOUT=enabled bundle exec rake assets:precompile \
  && rm -rf /patch /tmp/* spec node_modules tmp/cache \
  && yarn cache clean --all \
  && apk del .builddeps

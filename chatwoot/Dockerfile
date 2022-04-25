FROM chatwoot/chatwoot:v2.4.1

COPY ./patches/*.patch /patches/

RUN apk add --no-cache --virtual .builddeps git patch nodejs yarn \
  && for patch in /patches/*.patch; do if ! patch -p1 < "$patch"; then exit 1; fi; done \
  && SECRET_KEY_BASE=precompile_placeholder RAILS_LOG_TO_STDOUT=enabled bundle exec rake assets:precompile \
  && rm -rf /patch /tmp/* spec node_modules tmp/cache \
  && yarn cache clean --all \
  && apk del .builddeps

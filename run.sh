#!/usr/bin/env bash
set -e
set -o pipefail

_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
_jaa_env=${JAA_ENV:-dev}
_docker_compose_cmd="docker-compose --env-file "${_dir}/.env.${_jaa_env}" --file "${_dir}/docker-compose.yml" --file "${_dir}/docker-compose.${_jaa_env}.yml""
_stack_name='jaa'
readonly _dir _jaa_env _docker_compose_cmd _stack_name

if [[ $_jaa_env != 'dev' && $_jaa_env != 'prod' ]]; then
  echo "JAA_ENV must either be 'dev' or 'prod'"
  exit 1
fi

init() {
  getUuid() {
    {
      uuidgen | awk '{print tolower($0)}' ||
        cat /proc/sys/kernel/random/uuid ||
        python -c 'import uuid; print(uuid.uuid4())' ||
        ruby -r securerandom -e 'puts SecureRandom.uuid'
    } 2>/dev/null
  }

  getPassword() {
    declare len="$1"
    {
      pwgen -y -N1 "$len" ||
        {
          {
            LC_ALL=C tr -dc 'A-Za-z0-9!"#$%&'\''()*+,-./:;<=>?@[\]^_`{|}~' </dev/urandom
            ec=$?
            if [[ $ec -eq 141 ]]; then
              exit 0
            else
              exit "$ec"
            fi
          } | head -c "$len" && echo
        } ||
        { openssl rand -base64 $((len + 4)) | head -c "$len" && echo; }
    } 2>/dev/null
  }

  public_domain=${PUBLIC_DOMAIN:-example.org}
  papercups_key=${PAPERCUPS_KEY:-$(getPassword 64)}
  papercups_db_password=${PAPERCUPS_DB_PASSWORD:-$(getPassword 24)}
  papercups_registration_disabled=${PAPERCUPS_REGISTRATION_DISABLED:-false}
  directus_key=${DIRECTUS_KEY:-$(getUuid)}
  directus_secret=${DIRECTUS_SECRET:-$(getUuid)}
  directus_db_password=${DIRECTUS_DB_PASSWORD:-$(getPassword 24)}
  directus_admin_password=${DIRECTUS_ADMIN_PASSWORD:-$(getPassword 12)}

  declare -a envs
  envs+=("PUBLIC_DOMAIN=${public_domain}")
  envs+=("PAPERCUPS_REGISTRATION_DISABLED=${papercups_registration_disabled}")

  if [[ $_jaa_env == 'dev' ]]; then
    web_url="http://localhost:3000"
    directus_url="http://localhost:8055"
    papercups_url="http://localhost:4000"

    envs+=("PAPERCUPS_KEY=${papercups_key}")
    envs+=("PAPERCUPS_DB_PASSWORD=${papercups_db_password}")
    envs+=("DIRECTUS_KEY=${directus_key}")
    envs+=("DIRECTUS_SECRET=${directus_secret}")
    envs+=("DIRECTUS_DB_PASSWORD=${directus_db_password}")
    envs+=("DIRECTUS_ADMIN_PASSWORD=${directus_admin_password}")
  else
    web_url="https://${public_domain}"
    directus_url="https://directus.${public_domain}"
    papercups_url="https://papercups.${public_domain}"

    registry_prefix=${REGISTRY_PREFIX:-}
    traefik_network=${TRAEFIK_NETWORK:-web}
    traefik_entrypoints=${TRAEFIK_ENTRYPOINTS:-websecure}
    traefik_certresolver=${TRAEFIK_CERTRESOLVER:-le}

    envs+=("REGISTRY_PREFIX=${registry_prefix}")
    envs+=("TRAEFIK_NETWORK=${traefik_network}")
    envs+=("TRAEFIK_ENTRYPOINTS=${traefik_entrypoints}")
    envs+=("TRAEFIK_CERTRESOLVER=${traefik_certresolver}")

    echo 'Creating required Docker secrets...'
    {
      printf '%s' "$papercups_key" | docker secret create jaa_papercups_key -
      printf '%s' "$papercups_db_password" | docker secret create jaa_papercups_db_password -
      printf '%s' "$directus_key" | docker secret create jaa_directus_key -
      printf '%s' "$directus_secret" | docker secret create jaa_directus_secret -
      printf '%s' "$directus_db_password" | docker secret create jaa_directus_db_password -
      printf '%s' "$directus_admin_password" | docker secret create jaa_directus_admin_password -
    } >/dev/null
  fi

  if [[ -f "${_dir}/.env.${_jaa_env}" ]]; then
    read -r -p "The file .env.${_jaa_env} already exists. Do you want to overwrite it? [y/N] " response
    if [[ ! ${response,,} =~ ^y(es)?$ ]]; then
      exit
    fi
  fi
  echo "Creating .env.${_jaa_env} file..."
  printf "%s\n" "${envs[@]}" >"${_dir}/.env.${_jaa_env}"

  echo "Access data:
  Web:
    URL:  ${web_url}/admin
    Code: ${directus_admin_password}

  Directus:
    URL:      ${directus_url}
    User:     admin@${public_domain}
    Password: ${directus_admin_password}

  Papercups:
    URL: ${papercups_url}"
}

destroy() {
  read -r -p "All data will be deleted! Do you want to continue? [y/N] " response
  if [[ ${response,,} =~ ^y(es)?$ ]]; then
    set +e
    if [[ $_jaa_env == 'dev' ]]; then
      echo 'Removing containers...'
      $_docker_compose_cmd down --volumes
    else
      echo 'Removing stack...'
      docker stack rm jaa
      sleep 10
      echo 'Removing secrets...'
      docker secret rm \
        jaa_papercups_key \
        jaa_papercups_db_password \
        jaa_directus_key \
        jaa_directus_secret \
        jaa_directus_db_password \
        jaa_directus_admin_password \
        >/dev/null
      echo 'Removing volumes...'
      touch "${_dir}/.env.${_jaa_env}"
      for volume in $($_docker_compose_cmd config --volumes 2>/dev/null); do
        docker volume rm "${_stack_name}_${volume}" >/dev/null
      done
    fi
    echo 'Removing env file...'
    rm "${_dir}/.env.${_jaa_env}"
    set -e
  fi
  exit
}

do_images() {
  if [[ $_jaa_env == 'dev' ]]; then
    echo 'Building images...'
    $_docker_compose_cmd build --pull
  else
    echo 'Building images...'
    DOCKER_HOST="$DOCKER_BUILD_HOST" $_docker_compose_cmd build --pull --parallel

    echo 'Uploading images...'
    set -a
    source <(sed -e '/^#/d;/^\s*$/d' -e "s/'/'\\\''/g" -e "s/=\(.*\)/='\1'/g" "${_dir}/.env.${_jaa_env}")
    set +a
    if [[ -n $REGISTRY_PREFIX ]]; then
      DOCKER_HOST="$DOCKER_BUILD_HOST" $_docker_compose_cmd push
    else
      echo 'Uploading images...'
      DOCKER_HOST="$DOCKER_BUILD_HOST" docker save jaa-web papercups-chat-window | gzip | docker load
    fi
  fi
}

start() {
  if [[ $_jaa_env == 'dev' ]]; then
    echo 'Starting containers...'
    $_docker_compose_cmd up -d

    set -a
    source <(sed -e '/^#/d;/^\s*$/d' -e "s/'/'\\\''/g" -e "s/=\(.*\)/='\1'/g" "${_dir}/.env.${_jaa_env}")
    set +a
    echo "Starting web app..."
    exec npm run --prefix "${_dir}/web" dev
  else
    echo 'Deploying stack...'
    exec docker stack deploy --compose-file <($_docker_compose_cmd config) "$_stack_name"
  fi
}

cmd() {
  if [[ $_jaa_env == 'dev' ]]; then
    exec $_docker_compose_cmd "$@"
  else
    exec docker "$@"
  fi
}

case "$1" in
'init')
  init
  do_images
  start
  ;;
'do-images')
  do_images
  ;;
'destroy')
  destroy
  ;;
'')
  start
  ;;
*)
  cmd "$@"
  ;;
esac

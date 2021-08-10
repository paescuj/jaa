#!/usr/bin/env bash
set -e
set -o pipefail

# Global vars
_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
_jaa_env=${JAA_ENV:-dev}
_stack_name='jaa'
_env_file="${_dir}/.env.${_jaa_env}"
_compose_files=("${_dir}/docker-compose.yml" "${_dir}/docker-compose.${_jaa_env}.yml")
_docker_compose_cmd=('docker-compose' '--env-file' "$_env_file")
for compose_file in "${_compose_files[@]}"; do
  _docker_compose_cmd+=('--file' "$compose_file")
done
readonly _dir _jaa_env _stack_name _env_file _compose_files _docker_compose_cmd

# Function to get config
get_config() {
  if [[ -n $1 ]]; then
    declare -n _config="$1"
  else
    declare -A _config
  fi
  if [[ -n $2 ]]; then
    declare -n _envs="$2"
  else
    declare -a _envs
  fi
  if [[ -n $3 ]]; then
    declare -n _secrets="$3"
  else
    declare -a _secrets
  fi

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

  _config+=(
    [PUBLIC_DOMAIN]="${PUBLIC_DOMAIN:-jaa.example.org}"
    [DIRECTUS_KEY]="${DIRECTUS_KEY:-$(getUuid)}"
    [DIRECTUS_SECRET]="${DIRECTUS_SECRET:-$(getUuid)}"
    [DIRECTUS_DB_PASSWORD]="${DIRECTUS_DB_PASSWORD:-$(getPassword 24)}"
    [DIRECTUS_ADMIN_PASSWORD]="${DIRECTUS_ADMIN_PASSWORD:-$(getPassword 12)}"
    [CHATWOOT_SECRET_KEY_BASE]="${CHATWOOT_SECRET_KEY_BASE:-$(getPassword 64)}"
    [CHATWOOT_DB_PASSWORD]="${CHATWOOT_DB_PASSWORD:-$(getPassword 24)}"
  )
  _envs+=(
    'PUBLIC_DOMAIN'
  )

  if [[ $_jaa_env == 'dev' ]]; then
    _envs+=(
      'DIRECTUS_KEY'
      'DIRECTUS_SECRET'
      'DIRECTUS_DB_PASSWORD'
      'DIRECTUS_ADMIN_PASSWORD'
      'CHATWOOT_SECRET_KEY_BASE'
      'CHATWOOT_DB_PASSWORD'
    )
  else
    _config+=(
      [CHATWOOT_SMTP_ADDRESS]="${CHATWOOT_SMTP_ADDRESS:-mail.${_config[PUBLIC_DOMAIN]}}"
      [CHATWOOT_SMTP_AUTHENTICATION]="${CHATWOOT_SMTP_AUTHENTICATION:-plain}"
      [CHATWOOT_SMTP_DOMAIN]="$CHATWOOT_SMTP_DOMAIN"
      [CHATWOOT_SMTP_ENABLE_STARTTLS_AUTO]="${CHATWOOT_SMTP_ENABLE_STARTTLS_AUTO:-true}"
      [CHATWOOT_SMTP_PORT]="${CHATWOOT_SMTP_PORT:-587}"
      [CHATWOOT_SMTP_USERNAME]="${CHATWOOT_SMTP_USERNAME:-chatwoot@${_config[PUBLIC_DOMAIN]}}"
      [CHATWOOT_SMTP_PASSWORD]="${CHATWOOT_SMTP_PASSWORD:-$(getPassword 12)}"
      [REGISTRY_PREFIX]="${REGISTRY_PREFIX/%//}"
      [TRAEFIK_NETWORK]="${TRAEFIK_NETWORK:-web}"
      [TRAEFIK_ENTRYPOINTS]="${TRAEFIK_ENTRYPOINTS:-websecure}"
      [TRAEFIK_CERTRESOLVER]="${TRAEFIK_CERTRESOLVER:-le}"
      [DOCKER_HOST]="$DOCKER_HOST"
    )
    _config+=(
      [CHATWOOT_MAILER_SENDER_EMAIL]="${CHATWOOT_MAILER_SENDER_EMAIL:-${_config[CHATWOOT_SMTP_USERNAME]}}"
    )
    _envs+=(
      'CHATWOOT_MAILER_SENDER_EMAIL'
      'CHATWOOT_SMTP_ADDRESS'
      'CHATWOOT_SMTP_AUTHENTICATION'
      'CHATWOOT_SMTP_DOMAIN'
      'CHATWOOT_SMTP_ENABLE_STARTTLS_AUTO'
      'CHATWOOT_SMTP_PORT'
      'CHATWOOT_SMTP_USERNAME'
      'DOCKER_HOST'
      'REGISTRY_PREFIX'
      'TRAEFIK_NETWORK'
      'TRAEFIK_ENTRYPOINTS'
      'TRAEFIK_CERTRESOLVER'
    )
    _secrets+=(
      'DIRECTUS_KEY'
      'DIRECTUS_SECRET'
      'DIRECTUS_DB_PASSWORD'
      'DIRECTUS_ADMIN_PASSWORD'
      'CHATWOOT_SECRET_KEY_BASE'
      'CHATWOOT_DB_PASSWORD'
      'CHATWOOT_SMTP_PASSWORD'
    )
  fi
}

# Function to create env file / secrets
init() {
  if [[ -f "$_env_file" ]]; then
    read -r -p "The file $(basename "$_env_file") already exists. Do you want to overwrite it? [y/N] " response
    if [[ ! ${response,,} =~ ^y(es)?$ ]]; then
      exit
    fi
    rm "$_env_file"
  fi

  declare -A config
  declare -a envs secrets
  get_config 'config' 'envs' 'secrets'

  echo "Creating file '$(basename "$_env_file")'..."
  for env in "${envs[@]}"; do
    printf '%s=%s\n' "$env" "${config[$env]}" >>"$_env_file"
  done

  if [[ $_jaa_env == 'dev' ]]; then
    local web_url="http://localhost:3000"
    local directus_url="http://localhost:8055"
    local chatwoot_url="http://localhost:3001"
  else
    local web_url="https://${config[PUBLIC_DOMAIN]}"
    local directus_url="https://directus.${config[PUBLIC_DOMAIN]}"
    local chatwoot_url="https:/chatwoot.${config[PUBLIC_DOMAIN]}"

    echo 'Creating Docker secrets...'
    for secret in "${secrets[@]}"; do
      printf '%s' "${config[$secret]}" | docker secret create "${_stack_name}_${secret,,}" - >/dev/null
    done
  fi

  echo "Access data:
  Web:
    URL:  ${web_url}/admin
    Code: ${config[DIRECTUS_ADMIN_PASSWORD]}

  Directus:
    URL:      ${directus_url}
    User:     admin@${config[PUBLIC_DOMAIN]}
    Password: ${config[DIRECTUS_ADMIN_PASSWORD]}

  Chatwoot:
    URL: ${chatwoot_url}"
    if [[ -n ${config[CHATWOOT_SMTP_PASSWORD]} ]] && [[ -z $CHATWOOT_SMTP_PASSWORD ]]; then
      echo "    SMTP Password: ${config[CHATWOOT_SMTP_PASSWORD]}"
    fi

  for var in "${!config[@]}"; do
    unset "$var"
  done
}

# Function to delete all data
destroy() {
  read -r -p "All data will be deleted! Do you want to continue? [y/N] " response
  if [[ ${response,,} =~ ^y(es)?$ ]]; then
    set +e
    if [[ $_jaa_env == 'dev' ]]; then
      echo 'Removing containers...'
      "${_docker_compose_cmd[@]}" down --volumes
    else
      echo 'Removing stack...'
      docker stack rm "$_stack_name"
      sleep 10
      echo 'Removing secrets...'
      declare -a secrets
      get_config '' '' 'secrets'
      secrets=("${secrets[@],,}")
      secrets=("${secrets[@]/#/jaa_}")
      docker secret rm "${secrets[@]}" >/dev/null
      echo 'Removing volumes...'
      for volume in $("${_docker_compose_cmd[@]}" config --volumes 2>/dev/null); do
        docker volume rm "${_stack_name}_${volume}" >/dev/null
      done
    fi
    echo "Removing file '$(basename "$_env_file")'..."
    rm "$_env_file"
    set -e
  fi
  exit
}

# Function to build / push images
do_images() {
  echo 'Building images...'
  DOCKER_HOST="$DOCKER_BUILD_HOST" "${_docker_compose_cmd[@]}" build --pull --parallel

  if [[ $_jaa_env == 'prod' ]]; then
    echo 'Uploading images...'
    if [[ -n $REGISTRY_PREFIX ]]; then
      DOCKER_HOST="$DOCKER_BUILD_HOST" "${_docker_compose_cmd[@]}" push
    else
      readarray -t images < <("${_docker_compose_cmd[@]}" config --no-interpolate | sed -n 's/^.*image: ${REGISTRY_PREFIX:-}//p' | uniq)
      DOCKER_HOST="$DOCKER_BUILD_HOST" docker save "${images[@]}" | gzip | docker load
    fi
  fi
}

# Function to start the project
start() {
  if [[ $_jaa_env == 'dev' ]]; then
    echo 'Starting containers...'
    "${_docker_compose_cmd[@]}" up -d

    echo "Starting web app..."
    npm install --prefix "${_dir}/web"
    exec npm run --prefix "${_dir}/web" dev
  else
    echo 'Deploying stack...'
    docker_stack_deploy_cmd=('docker' 'stack' 'deploy')
    for compose_file in "${_compose_files[@]}"; do
      docker_stack_deploy_cmd+=('--compose-file' "$compose_file")
    done
    docker_stack_deploy_cmd+=("$_stack_name")
    exec "${docker_stack_deploy_cmd[@]}"
  fi
}

# Function to execute command in Docker context
cmd() {
  if [[ $_jaa_env == 'dev' ]]; then
    exec "${_docker_compose_cmd[@]}" "$@"
  else
    exec docker "$@"
  fi
}

main() {
  # Check env
  if [[ $_jaa_env != 'dev' && $_jaa_env != 'prod' ]]; then
    echo "JAA_ENV must either be 'dev' or 'prod'" >&2
    exit 1
  fi

  if [[ $1 != 'init' ]]; then
    # Check env file
    if [[ ! -f "$_env_file" ]]; then
      echo "Missing file '$(basename "$_env_file")'"
      exit 1
    # Load env file
    else
      set -a
      source <(sed -e '/^#/d;/^\s*$/d' -e "s/'/'\\\''/g" -e "s/=\(.*\)/='\1'/g" "$_env_file")
      set +a
    fi
  fi

  case "$1" in
  'init')
    init
    if [[ $2 != '--no-start' ]]; then
      main 'do-images'
      start
    fi
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
}

main "$@"

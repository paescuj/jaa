#!/usr/bin/env bash
set -o errexit
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
_chatwoot_enabled=${CHATWOOT_ENABLED:-true}
if [[ $_chatwoot_enabled == 'true' ]]; then
  _docker_compose_cmd+=('--profile' 'chatwoot')
fi
readonly _dir _jaa_env _stack_name _env_file _compose_files _docker_compose_cmd

# Function to print a message
print() {
  declare color="$1" message="$2"
  local color_reset='\x1b[0m'

  if [[ -v NO_COLOR ]]; then
    color=''
    color_reset=''
  fi

  while IFS=$'\n' read -r log_line; do
    printf "%b[%s]%b %s\n" "$color" "$(basename "$0")" "$color_reset" "$log_line"
  done <<< "$message"
}

# Function to print info message
info() {
  print '\x1b[32m' "$*"
}

# Function to print error message and exit
error() {
  print '\x1b[31m' "$*" >&2
  exit 1
}

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

  # Default registry
  REGISTRY_PREFIX=${REGISTRY_PREFIX:-paescuj}

  _config+=(
    [PUBLIC_DOMAIN]="${PUBLIC_DOMAIN:-jaa.example.org}"
    [DIRECTUS_KEY]="${DIRECTUS_KEY:-$(getUuid)}"
    [DIRECTUS_SECRET]="${DIRECTUS_SECRET:-$(getUuid)}"
    [DIRECTUS_DB_PASSWORD]="${DIRECTUS_DB_PASSWORD:-$(getPassword 24)}"
    [DIRECTUS_ADMIN_PASSWORD]="${DIRECTUS_ADMIN_PASSWORD:-$(getPassword 12)}"
    [CHATWOOT_SECRET_KEY_BASE]="${CHATWOOT_SECRET_KEY_BASE:-$(getPassword 64)}"
    [CHATWOOT_DB_PASSWORD]="${CHATWOOT_DB_PASSWORD:-$(getPassword 24)}"
    [REGISTRY_PREFIX]="${REGISTRY_PREFIX/%//}"
  )
  _envs+=(
    'PUBLIC_DOMAIN'
    'REGISTRY_PREFIX'
  )

  if [[ $_jaa_env = 'dev' ]]; then
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
    read -r -p "The file '$(basename "$_env_file")' already exists. Do you want to overwrite it? [y/N] " response
    if [[ ! ${response,,} =~ ^y(es)?$ ]]; then
      exit
    fi
    rm "$_env_file"
  fi

  declare -A config
  declare -a envs secrets
  get_config 'config' 'envs' 'secrets'

  info "Creating file '$(basename "$_env_file")'..."
  for env in "${envs[@]}"; do
    printf '%s=%s\n' "$env" "${config[$env]}" >>"$_env_file"
  done

  if [[ $_jaa_env = 'dev' ]]; then
    local web_url="http://localhost:3000"
    local directus_url="http://localhost:8055"
    local chatwoot_url="http://localhost:3001"
  else
    local web_url="https://${config[PUBLIC_DOMAIN]}"
    local directus_url="https://directus.${config[PUBLIC_DOMAIN]}"
    local chatwoot_url="https:/chatwoot.${config[PUBLIC_DOMAIN]}"

    info 'Creating Docker secrets...'
    for secret in "${secrets[@]}"; do
      printf '%s' "${config[$secret]}" | docker secret create "${_stack_name}_${secret,,}" - >/dev/null
    done
  fi

  info "Access data:
  Web:
    URL:  ${web_url}/admin"
  if [[ -z $DIRECTUS_ADMIN_PASSWORD ]]; then
    info "    Code: ${config[DIRECTUS_ADMIN_PASSWORD]}"
  fi
  info "
  Directus:
    URL:      ${directus_url}
    User:     admin@${config[PUBLIC_DOMAIN]}"
  if [[ -z $DIRECTUS_ADMIN_PASSWORD ]]; then
    info "    Password: ${config[DIRECTUS_ADMIN_PASSWORD]}"
  fi
  if [[ $_chatwoot_enabled == 'true' ]]; then
    info "
    Chatwoot:
      URL: ${chatwoot_url}"
    if [[ -n ${config[CHATWOOT_SMTP_PASSWORD]} ]] && [[ -z $CHATWOOT_SMTP_PASSWORD ]]; then
      info "    SMTP Password: ${config[CHATWOOT_SMTP_PASSWORD]}"
    fi
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
    if [[ $_jaa_env = 'dev' ]]; then
      info 'Removing containers...'
      "${_docker_compose_cmd[@]}" down --volumes
    else
      info 'Removing stack...'
      docker stack rm "$_stack_name"
      sleep 10
      info 'Removing secrets...'
      declare -a secrets
      get_config '' '' 'secrets'
      secrets=("${secrets[@],,}")
      secrets=("${secrets[@]/#/jaa_}")
      docker secret rm "${secrets[@]}" >/dev/null
      info 'Removing volumes...'
      for volume in $("${_docker_compose_cmd[@]}" config --volumes 2>/dev/null); do
        docker volume rm "${_stack_name}_${volume}" >/dev/null
      done
    fi
    info "Removing file '$(basename "$_env_file")'..."
    rm "$_env_file"
    set -e
  fi
}

# Function to build / push images
do_images() {
  if [[ $_jaa_env = 'prod' && -n $REGISTRY_PREFIX ]]; then
    info 'Fetching existing images...'
    declare -a images
    readarray -t images < <("${_docker_compose_cmd[@]}" config | sed -n "s/^.*image: \(${REGISTRY_PREFIX//\//\\/}.*\)$/\1/p" | uniq)
    declare -a pull_pids
    for image in "${images[@]}"; do
      DOCKER_HOST="$DOCKER_BUILD_HOST" docker pull "${image}" &
      pull_pids+=($!)
    done
    for pid in "${pull_pids[@]}"; do
      wait "$pid"
    done
  fi

  info 'Building images...'
  DOCKER_HOST="$DOCKER_BUILD_HOST" "${_docker_compose_cmd[@]}" build --pull --parallel

  if [[ $_jaa_env = 'prod' ]]; then
    info 'Uploading images...'
    if [[ -n $REGISTRY_PREFIX ]]; then
      declare -a push_pids
      local images_up_to_date=true
      for image in "${images[@]}"; do
        local digest
        digest=$(DOCKER_HOST="$DOCKER_BUILD_HOST" docker image inspect --format '{{.RepoDigests}}' "${image}")
        #??Empty repo digest indicates that image has changed
        if [[ $digest = '[]' ]]; then
          images_up_to_date=false
          DOCKER_HOST="$DOCKER_BUILD_HOST" docker push "$image" &
          push_pids+=($!)
        fi
      done
      for pid in "${push_pids[@]}"; do
        wait "$pid"
      done
      if [[ $images_up_to_date = true ]]; then
        info 'Images on registry already up to date'
      fi
    else
      DOCKER_HOST="$DOCKER_BUILD_HOST" docker save "${images[@]}" | gzip | docker load
    fi
  fi
}

# Function to start the project
start() {
  if [[ $_jaa_env = 'dev' ]]; then
    info 'Starting containers...'
    "${_docker_compose_cmd[@]}" up -d

    info "Starting web app..."
    npm install --prefix "${_dir}/web"
    exec npm run --prefix "${_dir}/web" dev
  else
    info 'Deploying stack...'
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
  if [[ $_jaa_env = 'dev' ]]; then
    exec "${_docker_compose_cmd[@]}" "$@"
  else
    exec docker "$@"
  fi
}

main() {
  # Check env
  if [[ $_jaa_env != 'dev' && $_jaa_env != 'prod' ]]; then
    error "JAA_ENV must either be 'dev' or 'prod'"
  fi

  if [[ $1 != 'init' ]]; then
    # Check env file
    if [[ ! -f "$_env_file" ]]; then
      error "Missing file '$(basename "$_env_file")'"
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

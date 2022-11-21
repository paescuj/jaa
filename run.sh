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
readonly _dir _jaa_env _stack_name _env_file _compose_files

# Print a message
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

# Print info message
info() {
  print '\x1b[32m' "$*"
}

# Print error message and exit
error() {
  print '\x1b[31m' "$*" >&2
  exit 1
}

# Get config
get_config() {
  if [[ -n $1 ]]; then
    declare -n _envs="$1"
  else
    declare -a _envs
  fi
  if [[ -n $2 ]]; then
    declare -n _secrets="$2"
  else
    declare -a _secrets
  fi

  get_uuid() {
    {
      uuidgen | awk '{print tolower($0)}' ||
        cat /proc/sys/kernel/random/uuid ||
        python -c 'import uuid; print(uuid.uuid4())' ||
        ruby -r securerandom -e 'puts SecureRandom.uuid'
    } 2>/dev/null
  }

  get_password() {
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

  # Base envs
  _envs+=(
    [PUBLIC_DOMAIN]="${PUBLIC_DOMAIN:-jaa.example.org}"
    [REGISTRY_PREFIX]=$(printf '%s' "${REGISTRY_PREFIX:-paescuj}" | sed '/\/$/!s/$/\/&/')
    [CHATWOOT_ENABLED]="${CHATWOOT_ENABLED:-true}"
  )

  # Base secrets
  _secrets+=(
    [DIRECTUS_KEY]="${DIRECTUS_KEY:-$(get_uuid)}"
    [DIRECTUS_SECRET]="${DIRECTUS_SECRET:-$(get_uuid)}"
    [DIRECTUS_DB_PASSWORD]="${DIRECTUS_DB_PASSWORD:-$(get_password 24)}"
    [DIRECTUS_ADMIN_PASSWORD]="${DIRECTUS_ADMIN_PASSWORD:-$(get_password 12)}"
    [CHATWOOT_SECRET_KEY_BASE]="${CHATWOOT_SECRET_KEY_BASE:-$(get_password 64)}"
    [CHATWOOT_DB_PASSWORD]="${CHATWOOT_DB_PASSWORD:-$(get_password 24)}"
  )

  if [[ $_jaa_env = 'prod' ]]; then
    _envs+=(
      [CHATWOOT_SMTP_ADDRESS]="${CHATWOOT_SMTP_ADDRESS:-mail.${_envs[PUBLIC_DOMAIN]}}"
      [CHATWOOT_SMTP_AUTHENTICATION]="${CHATWOOT_SMTP_AUTHENTICATION:-plain}"
      [CHATWOOT_SMTP_DOMAIN]="$CHATWOOT_SMTP_DOMAIN"
      [CHATWOOT_SMTP_ENABLE_STARTTLS_AUTO]="${CHATWOOT_SMTP_ENABLE_STARTTLS_AUTO:-true}"
      [CHATWOOT_SMTP_PORT]="${CHATWOOT_SMTP_PORT:-587}"
      [CHATWOOT_SMTP_USERNAME]="${CHATWOOT_SMTP_USERNAME:-chatwoot@${_envs[PUBLIC_DOMAIN]}}"
      [TRAEFIK_NETWORK]="${TRAEFIK_NETWORK:-web}"
      [TRAEFIK_ENTRYPOINTS]="${TRAEFIK_ENTRYPOINTS:-websecure}"
      [TRAEFIK_CERTRESOLVER]="${TRAEFIK_CERTRESOLVER:-le}"
      [DOCKER_HOST]="$DOCKER_HOST"
    )
    _envs+=(
      [CHATWOOT_MAILER_SENDER_EMAIL]="${CHATWOOT_MAILER_SENDER_EMAIL:-${_envs[CHATWOOT_SMTP_USERNAME]}}"
    )

    _secrets+=(
      [CHATWOOT_SMTP_PASSWORD]="${CHATWOOT_SMTP_PASSWORD:-$(get_password 12)}"
    )
  fi
}

# Create env file / secrets
init() {
  declare -n _access_data="$1"

  if [[ -f "$_env_file" ]]; then
    read -r -p "The file '$(basename "$_env_file")' already exists. Do you want to overwrite it? [y/N] " response
    if [[ ! ${response,,} =~ ^y(es)?$ ]]; then
      exit
    fi
    rm "$_env_file"
  fi

  declare -A envs secrets
  get_config 'envs' 'secrets'

  if [[ $_jaa_env = 'dev' ]]; then
    local web_url="http://localhost:3000"
    local directus_url="http://localhost:8055"
    local chatwoot_url="http://localhost:3001"

    for key in "${!secrets[@]}"; do
      envs[$key]="${secrets[$key]}"
    done
  else
    local web_url="https://${envs[PUBLIC_DOMAIN]}"
    local directus_url="https://directus.${envs[PUBLIC_DOMAIN]}"
    local chatwoot_url="https:/chatwoot.${envs[PUBLIC_DOMAIN]}"

    info 'Creating Docker secrets...'
    for key in "${!secrets[@]}"; do
      printf '%s' "${secrets[$key]}" | docker secret create "${_stack_name}_${key,,}" - >/dev/null
    done
  fi

  info "Creating file '$(basename "$_env_file")'..."
  for env in "${!envs[@]}"; do
    local safe_value=$(printf '%s' "${envs[$env]}" | sed -e 's/\$/$$/g' -e 's/"/\\"/g')
    printf '%s="%s"\n' "$env" "$safe_value" >>"$_env_file"
  done

  add_line() {
    declare content="$1"
    _access_data+="$content"$'\n'
  }

  add_line
  add_line $'\033[1m'"Access Data"$'\033[0m'
  add_line "  Web:"
  add_line "    URL:  ${web_url}/admin"
  if [[ -z $DIRECTUS_ADMIN_PASSWORD ]]; then
    add_line "    Code: ${secrets[DIRECTUS_ADMIN_PASSWORD]}"
  fi
  add_line
  add_line "  Directus:"
  add_line "    URL:      ${directus_url}"
  add_line "    User:     admin@${envs[PUBLIC_DOMAIN]}"
  if [[ -z $DIRECTUS_ADMIN_PASSWORD ]]; then
    add_line "    Password: ${secrets[DIRECTUS_ADMIN_PASSWORD]}"
  fi
  if [[ ${envs[CHATWOOT_ENABLED]} = 'true' ]]; then
    add_line
    add_line "  Chatwoot:"
    add_line "    URL: ${chatwoot_url}"
    if [[ -n ${secrets[CHATWOOT_SMTP_PASSWORD]} ]] && [[ -z $CHATWOOT_SMTP_PASSWORD ]]; then
      add_line "    SMTP Password: ${secrets[CHATWOOT_SMTP_PASSWORD]}"
    fi
  fi
}

# Delete all data
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
      declare -A secrets
      get_config '' 'secrets'
      secrets_keys=("${!secrets[@]}")
      secrets_keys=("${_secrets[@],,}")
      secrets_keys=("${_secrets[@]/#/${_stack_name}_}")
      docker secret rm "${secrets_keys[@]}" >/dev/null
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

# Build / push images
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
        # Empty repo digest indicates that image has changed
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

# Start the project
start() {
  if [[ $_jaa_env = 'dev' ]]; then
    info 'Starting containers...'
    "${_docker_compose_cmd[@]}" up -d

    shutdown() {
      info 'Stopping containers...'
      "${_docker_compose_cmd[@]}" stop
    }
    trap shutdown SIGINT

    info "Installing / refreshing web dependencies..."
    pnpm install --dir "${_dir}/web"

    info "Starting web app..."
    pnpm run --dir "${_dir}/web" dev
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

# Execute command in Docker context
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
    fi

    # Load env file
    set -a
    source <(sed -e '/^#/d;/^\s*$/d' -e 's/`/\\`/g' -e 's/\$\$/\\$/g' "$_env_file")
    set +a

    if [[ $CHATWOOT_ENABLED = 'true' ]]; then
      _docker_compose_cmd+=('--profile' 'chatwoot')
    fi
  fi

  case "$1" in
  'init')
    local access_data
    init 'access_data'
    if [[ $2 != '--no-start' ]]; then
      main 'do-images'
      info "$access_data"
      start
    else
      info "$access_data"
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

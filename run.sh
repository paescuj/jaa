#!/usr/bin/env bash
set -e
set -o pipefail

# Global vars
_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
_jaa_env=${JAA_ENV:-dev}
_stack_name='jaa'
_env_file="${_dir}/.env.${_jaa_env}"
_compose_files=("${_dir}/docker-compose.yml" "${_dir}/docker-compose.${_jaa_env}.yml")
if docker compose >/dev/null 2>&1; then
  _docker_compose_cmd=('docker' 'compose')
else
  _docker_compose_cmd=('docker-compose')
fi
_docker_compose_cmd+=('--env-file' "$_env_file")
for compose_file in "${_compose_files[@]}"; do
  _docker_compose_cmd+=('--file' "$compose_file")
done
_get_env_cmd=('sed' '-e' '/^#/d;/^\s*$/d' '-e' "s/'/'\\\''/g" '-e' "s/=\(.*\)/='\1'/g" "$_env_file")
_secrets=(
  'DIRECTUS_KEY'
  'DIRECTUS_SECRET'
  'DIRECTUS_DB_PASSWORD'
  'DIRECTUS_ADMIN_PASSWORD'
  'PAPERCUPS_KEY'
  'PAPERCUPS_DB_PASSWORD'
  'PAPERCUPS_SMTP_PASSWORD'
)
readonly _dir _jaa_env _stack_name _env_file _compose_files _docker_compose_cmd _get_env_cmd _secrets

# Function to create env file / secrets
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

  local public_domain="${PUBLIC_DOMAIN:-jaa.example.org}"
  declare -A config=(
    [PUBLIC_DOMAIN]="$public_domain"
    [DIRECTUS_KEY]="${DIRECTUS_KEY:-$(getUuid)}"
    [DIRECTUS_SECRET]="${DIRECTUS_SECRET:-$(getUuid)}"
    [DIRECTUS_DB_PASSWORD]="${DIRECTUS_DB_PASSWORD:-$(getPassword 24)}"
    [DIRECTUS_ADMIN_PASSWORD]="${DIRECTUS_ADMIN_PASSWORD:-$(getPassword 12)}"
    [PAPERCUPS_KEY]="${PAPERCUPS_KEY:-$(getPassword 64)}"
    [PAPERCUPS_DB_PASSWORD]="${PAPERCUPS_DB_PASSWORD:-$(getPassword 24)}"
    [PAPERCUPS_REGISTRATION_DISABLED]="${PAPERCUPS_REGISTRATION_DISABLED:-false}"
    [DOCKER_HOST]="$DOCKER_HOST"
    [REGISTRY_PREFIX]="${REGISTRY_PREFIX:-}"
    [TRAEFIK_NETWORK]="${TRAEFIK_NETWORK:-web}"
    [TRAEFIK_ENTRYPOINTS]="${TRAEFIK_ENTRYPOINTS:-websecure}"
    [TRAEFIK_CERTRESOLVER]="${TRAEFIK_CERTRESOLVER:-le}"
    [PAPERCUPS_SMTP_HOST]="${PAPERCUPS_SMTP_HOST:-mail.${public_domain}}"
    [PAPERCUPS_SMTP_PORT]="${PAPERCUPS_SMTP_PORT:-465}"
    [PAPERCUPS_SMTP_SSL]="${PAPERCUPS_SMTP_SSL:-true}"
    [PAPERCUPS_SMTP_USER]=${PAPERCUPS_SMTP_USER:-papercups@${public_domain}}
    [PAPERCUPS_SMTP_PASSWORD]="${PAPERCUPS_SMTP_PASSWORD:-$(getPassword 12)}"
  )

  declare -a envs=(
    'PUBLIC_DOMAIN'
    'PAPERCUPS_REGISTRATION_DISABLED'
  )

  if [[ $_jaa_env == 'dev' ]]; then
    local web_url="http://localhost:3000"
    local directus_url="http://localhost:8055"
    local papercups_url="http://localhost:4000"

    envs+=(
      'DIRECTUS_KEY'
      'DIRECTUS_SECRET'
      'DIRECTUS_DB_PASSWORD'
      'DIRECTUS_ADMIN_PASSWORD'
      'PAPERCUPS_KEY'
      'PAPERCUPS_DB_PASSWORD'
    )
  else
    local web_url="https://${public_domain}"
    local directus_url="https://directus.${public_domain}"
    local papercups_url="https://papercups.${public_domain}"

    envs+=(
      'DOCKER_HOST'
      'REGISTRY_PREFIX'
      'TRAEFIK_NETWORK'
      'TRAEFIK_ENTRYPOINTS'
      'TRAEFIK_CERTRESOLVER'
      'PAPERCUPS_SMTP_HOST'
      'PAPERCUPS_SMTP_PORT'
      'PAPERCUPS_SMTP_SSL'
      'PAPERCUPS_SMTP_USER'
    )

    echo 'Creating required Docker secrets...'
    for secret in "${_secrets[@]}"; do
      printf '%s' "${config[$secret]}" | docker secret create jaa_${secret,,} - >/dev/null
    done
  fi

  if [[ -f "$_env_file" ]]; then
    read -r -p "The file $(basename "$_env_file") already exists. Do you want to overwrite it? [y/N] " response
    if [[ ! ${response,,} =~ ^y(es)?$ ]]; then
      exit
    fi
    rm "$_env_file"
  fi
  echo "Creating $(basename "$_env_file") file..."
  for env in "${envs[@]}"; do
    printf '%s=%s\n' "$env" "${config[$env]}" >>"$_env_file"
  done

  echo "Access data:
  Web:
    URL:  ${web_url}/admin
    Code: ${config[DIRECTUS_ADMIN_PASSWORD]}

  Directus:
    URL:      ${directus_url}
    User:     admin@${public_domain}
    Password: ${config[DIRECTUS_ADMIN_PASSWORD]}

  Papercups:
    URL: ${papercups_url}"
    if [[ $_jaa_env == 'prod' ]] && [[ -z $PAPERCUPS_SMTP_PASSWORD ]]; then
      echo "    SMTP Password: ${config[PAPERCUPS_SMTP_PASSWORD]}"
    fi
}

# Function to delete all data
destroy() {
  read -r -p "All data will be deleted! Do you want to continue? [y/N] " response
  if [[ ${response,,} =~ ^y(es)?$ ]]; then
    set +e
    touch "$_env_file"
    if [[ $_jaa_env == 'dev' ]]; then
      echo 'Removing containers...'
      "${_docker_compose_cmd[@]}" down --volumes
    else
      echo 'Removing stack...'
      docker stack rm jaa
      sleep 10
      echo 'Removing secrets...'
      declare -a secrets
      for secret in "${_secrets[@]}"; do
        secrets+=("jaa_${secret,,}")
      done
      docker secret rm "${secrets[@]}" >/dev/null
      echo 'Removing volumes...'
      for volume in $("${_docker_compose_cmd[@]}" config --volumes 2>/dev/null); do
        docker volume rm "${_stack_name}_${volume}" >/dev/null
      done
    fi
    echo 'Removing env file...'
    rm "$_env_file"
    set -e
  fi
  exit
}

# Function to build / upload images
do_images() {
  local build_args=('build' '--pull' '--parallel')
  if [[ -n $1 ]]; then
    build_args+=("$1")
  fi
  if [[ $_jaa_env == 'dev' ]]; then
    echo 'Building images...'
    "${_docker_compose_cmd[@]}" "${build_args[@]}"
  else
    echo 'Building images...'
    DOCKER_HOST="$DOCKER_BUILD_HOST" "${_docker_compose_cmd[@]}" "${build_args[@]}"

    echo 'Uploading images...'
    source <("${_get_env_cmd[@]}" | grep '^REGISTRY_PREFIX=')
    if [[ -n $REGISTRY_PREFIX ]]; then
      DOCKER_HOST="$DOCKER_BUILD_HOST" "${_docker_compose_cmd[@]}" push
    else
      echo 'Uploading images...'
      DOCKER_HOST="$DOCKER_BUILD_HOST" docker save jaa-web papercups-chat-window | gzip | docker load
    fi
  fi
}

# Function to start the project
start() {
  if [[ $_jaa_env == 'dev' ]]; then
    echo 'Starting containers...'
    "${_docker_compose_cmd[@]}" up -d

    set -a
    source <("${_get_env_cmd[@]}")
    set +a
    echo "Starting web app..."
    npm install --prefix "${_dir}/web"
    exec npm run --prefix "${_dir}/web" dev
  else
    echo 'Deploying stack...'
    set -a
    source <("${_get_env_cmd[@]}" | grep -v '^DOCKER_HOST=')
    set +a
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

  # Check env file / load DOCKER_HOST var
  if [[ $1 != 'init' ]]; then
    if [[ ! -f "$_env_file" ]]; then
      echo "Missing file $(basename "$_env_file")"
      exit 1
    elif [[ -z $DOCKER_HOST ]]; then
      set -a
      source <("${_get_env_cmd[@]}" | grep '^DOCKER_HOST=')
      set +a
    fi
  fi

  case "$1" in
  'init')
    init
    if [[ $2 != '--no-start' ]]; then
      do_images
      start
    fi
    ;;
  'do-images')
    do_images "$2"
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

# Jaa (Job Application Assistant)

A different way to manage and present your job application

## Development

### Initialization

Initialize and start the dev environment:
```bash
# Random access data will be generated and displayed during initialization
./run.sh init
```

### Commands

Start dev environment when already initialized:
```bash
./run.sh
```

Run arbitrary `docker-compose` command:
```bash
./run.sh ps
```

Destroy the dev environment:
```bash
./run.sh destroy
```

## Production

Currently intended for a single [Docker swarm](https://docs.docker.com/engine/swarm/) host with [Traefik](https://traefik.io/traefik/) configured.

### Initialization

Initialize the app:
```bash
export DOCKER_HOST='ssh://user@remotehost'
export JAA_ENV='prod'
export PUBLIC_DOMAIN='jaa.example.org'

# Random access data will be generated and displayed during initialization
./run.sh init
```

#### Papercups
* Create a Papercups account (Hint: Use your name as company name):
  ```bash
  echo "https://papercups.${PUBLIC_DOMAIN}/register"
  ```
* Immediately afterwards, disable registration for further accounts:
  ```bash
  sed -i '' -E 's/^(PAPERCUPS_REGISTRATION_DISABLED=).*$/\1true/' ".env.${JAA_ENV}" && ./run.sh
  ```
* Update your profile:
  ```bash
  echo "https://papercups.${PUBLIC_DOMAIN}/settings/profile"
  ```
* Adjust the [settings for the chat widget](#recommended-chat-widget-settings) and get the token:
  ```bash
  echo "https://papercups.${PUBLIC_DOMAIN}/settings/chat-widget"
  ```
* Log in to the «Job Application Assistant» with the admin user and store the token under the settings tab:
  ```bash
  echo "https://${PUBLIC_DOMAIN}/admin"
  ```

##### Recommended chat widget settings
| Setting | Value |
|---|---|
| Title | Chatten Sie mit mir 😃 |
| Subtitle | " " (_whitespace_ to disable subtitle) |
| Greeting | Guten Tag! Gerne stehe ich Ihnen zur Verfügung! Sollte ich gerade offline sein, so können Sie mir eine Nachricht hinterlassen und ich werde Ihnen baldmöglichst unter Ihrer angegebenen E-Mail-Adresse antworten. |
| New message placeholder | Ihre Nachricht... |
| Require unidentified customers to provide their email upfront? | Yes |
| Show agent availability? | Yes |
| Text when agents are available | Ich bin online |
| Text when agents are unavailable | Ich bin gerade offline |

### Commands

Update / redeploy the app:
```bash
DOCKER_HOST='ssh://user@remotehost' JAA_ENV='prod' ./run.sh
```

Run arbitrary `docker` command:
```bash
DOCKER_HOST='ssh://user@remotehost' JAA_ENV='prod' ./run.sh stack ps jaa
```

Undeploy and delete everything (⚠️):
```bash
DOCKER_HOST='ssh://user@remotehost' JAA_ENV='prod' ./run.sh destroy
```


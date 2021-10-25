<h1 align="center">
  <img src="https://raw.githubusercontent.com/paescuj/jaa/main/assets/logo.png" alt="Job Application Assistant" width="600">
</h1>

<p align="center">
  <strong>A different way to manage and present your job applications</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/paescuj/jaa" alt="License"></a>
  <a href="https://github.com/paescuj/jaa/actions/workflows/continuous-integration.yml"><img src="https://github.com/paescuj/jaa/actions/workflows/continuous-integration.yml/badge.svg" alt="Continuous Integration"></a>
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#usage">Usage</a> •
  <a href="#built-with">Built With</a> •
  <a href="#license">License</a>
</p>

![Demo](https://raw.githubusercontent.com/paescuj/jaa/main/assets/demo.gif)

## Key Features

* Admin area where you can add and manage all your job applications:
  * Upload of generic and job-specific application documents (PDFs)
  * Automatically generates and stores screenshots of job ads and preview of documents
* Dedicated access for each company:
  * Web page with introduction text, application documents and chat widget
  * Companies will be able to filter, search, drag'n'drop and download application documents and chat with you
* About page
* Light & dark mode
* Responsive and accessible

## Usage

### Development

#### Development - Initialization

Initialize and start the dev environment:
```bash
# Random access data will be generated and displayed during initialization
./run.sh init
```

#### Development - Commands

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

### Production

Currently intended for a single [Docker swarm](https://docs.docker.com/engine/swarm/) host with [Traefik](https://traefik.io/traefik/) configured.

#### Production - Initialization

Initialize the app:
```bash
# Docker host where the app is deployed to
export DOCKER_HOST='ssh://user@remotehost'
# Domain under which the app will be available
export PUBLIC_DOMAIN='jaa.example.org'
# Registry where the image will be pushed to (e.g. your Docker Hub user or URL to another registry)
# (if omitted, the image is uploaded directly to your DOCKER_HOST)
export REGISTRY_PREFIX='docker-hub-user'
export JAA_ENV='prod'

# For further configuration variables, consolidate the 'run.sh' script.
# You can also change them later on in the '.env.prod' file.
# Some examples:
# export CHATWOOT_SMTP_ADDRESS='mail.example.org'
# export CHATWOOT_SMTP_USERNAME='chatwoot@jaa.example.org'
# export CHATWOOT_SMTP_PASSWORD='your-mail-account-password'

# Random access data will be generated and displayed during initialization
./run.sh init
```

##### Chatwoot

* Log in to the «Job Application Assistant» with the admin user, go to the settings tab and click on the Chatwoot instance link.
* Create a Chatwoot account.

  *(Hint: Use your name as company name)*
* Get your API token from the profile settings page.
* Back in the «Job Application Assistant», click on the Chatwoot setup button and paste your token there.

#### Production - Commands

Update / redeploy the app:
```bash
JAA_ENV='prod' ./run.sh
```

Run arbitrary `docker` command:
```bash
JAA_ENV='prod' ./run.sh stack ps jaa
```

Undeploy and delete everything (⚠️):
```bash
JAA_ENV='prod' ./run.sh destroy
```

## Built With

Jaa is built with the following great open source components:
* [Next.js](https://nextjs.org) - The React Framework for Production
* [Chakra UI](https://chakra-ui.com) - A simple, modular and accessible component library
* [Iconoir](https://iconoir.com) - The Definitive Open Source Icons Library
* [Directus](https://directus.io) - Open-Source Data Platform
* [PostgreSQL](https://www.postgresql.org) - The World's Most Advanced Open Source Relational Database
* [Chatwoot](https://www.chatwoot.com) - Open-source, self-hosted customer communication platform
* [Docker](https://www.docker.com/community/open-source) - Containerization technology

## License

[MIT](./LICENSE)

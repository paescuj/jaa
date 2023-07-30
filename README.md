<h1 align="center">
  <img src="https://raw.githubusercontent.com/paescuj/jaa/main/assets/logo.png" alt="Job Application Assistant" width="600">
</h1>

<p align="center">
  <strong>Keep track of your ongoing job applications and impress your future employer with a unique way of applying</strong>
</p>

<p align="center">
  <a href="https://github.com/paescuj/jaa/blob/main/LICENSE"><img src="https://img.shields.io/github/license/paescuj/jaa?label=License" alt="License"></a>
  <a href="https://github.com/paescuj/jaa/actions/workflows/ci.yml"><img src="https://github.com/paescuj/jaa/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#usage">Usage</a> •
  <a href="#built-with">Built With</a> •
	<a href="#disclaimer">Disclaimer</a> •
  <a href="#license">License</a>
</p>

![Demo](https://raw.githubusercontent.com/paescuj/jaa/main/assets/demo.gif)

## Key Features

- Admin area where you can manage all your job applications:
  - Upload of generic and job-specific application documents (PDFs)
  - Automatically generates and stores screenshots of job ads and documents
- Dedicated access for each company:
  - Web page with introduction text, application documents and chat widget
  - Companies will be able to filter, search, drag'n'drop and download application documents and chat with you
- About page
- Light & dark mode
- Responsive & accessible

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
./run.sh cmd ps
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

- Log in to the «Job Application Assistant» with the admin user, go to the settings tab and click on the Chatwoot instance link.
- Create a Chatwoot account.

  _(Hint: Use your name as company name)_

- Get your API token from the profile settings page.
- Back in the «Job Application Assistant», click on the Chatwoot setup button and paste your token there.

#### Production - Commands

Update / redeploy the app:

```bash
JAA_ENV='prod' ./run.sh
```

Run arbitrary `docker` command:

```bash
JAA_ENV='prod' ./run.sh cmd stack ps jaa
```

Undeploy and delete everything (⚠️):

```bash
JAA_ENV='prod' ./run.sh destroy
```

## Built With

Jaa is built with the following great open source components:

- [Next.js](https://nextjs.org) - The React Framework for Production
- [Chakra UI](https://chakra-ui.com) - A simple, modular and accessible component library
- [Iconoir](https://iconoir.com) - The Definitive Open Source Icons Library
- [Directus](https://directus.io) - Open-Source Data Platform
- [PostgreSQL](https://www.postgresql.org) - The World's Most Advanced Open Source Relational Database
- [Chatwoot](https://www.chatwoot.com) - Open-source, self-hosted customer communication platform
- [Docker](https://www.docker.com/community/open-source) - Containerization technology
- ... and many more

## Disclaimer

This is a fun project, intended as a playground to experiment with different technologies. Therefore the project is not actively maintained.

## License

[MIT](./LICENSE)

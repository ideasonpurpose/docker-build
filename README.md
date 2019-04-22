# Docker Build Tools

[![dockeri.co](http://dockeri.co/image/ideasonpurpose/docker-build)](https://hub.docker.com/r/ideasonpurpose/docker-build)

This repository is the source for Docker AutoBuilds. Get the image on DockerHub: [hub.docker.com/r/ideasonpurpose/docker-build](https://hub.docker.com/r/ideasonpurpose/docker-build)

## Running a build from Docker

Example run:

**Mac/Linux**

```sh
$ docker run -p 8080:8080 --env NAME=iop-sscgf --env HOSTNAME=joes-mbp.local -v $PWD:/usr/src/site ideasonpurpose/docker-build npm run devserver
```

**Windows Command Line**

```cmd
$ docker run -p 8080:8080 --env NAME=iop-sscgf --env HOSTNAME=joes-mbp.local -v %cd%:/usr/src/site ideasonpurpose/docker-build npm run devserver
```

Note: If Windows throws a "driver failed programming external connectivity on endpoint" error, restart Docker. See [docker/for-win#2722](https://github.com/docker/for-win/issues/2722)

### Commands

Known script commands can be executed using just their name, no need to prefix with `npm run`.

#### `build`

Runs a webpack production build. This will also generate a zipped snapshot. _(todo: does this work?)_

#### `start`

Builds assets, starts the Webpack DevServer and watches files for changes.

#### `analyze`

Runs a webpack production build then starts the Webpack Bundle Analyzer. Connect a local port to 8080 to view.

### Environment vars

#### `NAME`

The name of the project, ideaslly the `name` property from package.json. This should match the directory containing the project files.

### Volumes

Mount the project's web root directory to `/usr/src/site`

## Todo

- config file (load `/usr/src/site/_config.yml` from our webpack config)
- Shrink image, start from node:11-slim or node:11-alpine
- ~~auto-inject local hostname or IP~~
- ~~Docker autobuilds~~

## Notes

> Documentation notes to be cleaned up

Tooling runs from `/usr/src/tools` inside the Docker image. Site files are expected to be mounted to `/usr/src/site`

Requesting `/webpack/reload` from the devserver will will trigger a full reload for all connected clients.

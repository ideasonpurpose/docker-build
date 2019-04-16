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

This should likely be masked behind simple npm run commands. They're not compliicated, just messy.

#### `build`

Runs a webpack production build. This will also generate a zipped snapshot. _(todo: does this work?)_

#### `devserver`

Runs webpack DevServer

### Environment vars

#### `NAME`

The name of the project, should match the directory containing the site files.

#### `HOSTNAME`

The IP or local address of the host. Used for accessing the devserver from other devices on the same local network.

### Volumes

Mount the project's web root directory to `/usr/src/site`

## Todo

Lots.

- config file (load `/usr/src/site/_config.yml` from our webpack config)
- auto-inject local hostname or IP
- ~~Docker autobuilds~~

## Notes

> Documentation notes to be cleaned up

Tooling runs from `/usr/src/tools` inside the Docker image. Site files are expected to be mounted to `/usr/src/site`

Requesting `/webpack/reload` from the devserver will will trigger a full reload for all connected clients.

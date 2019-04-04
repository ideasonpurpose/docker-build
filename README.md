# Docker Build Tools

[![dockeri.co](http://dockeri.co/image/ideasonpurpose/docker-build)](https://registry.hub.docker.com/ideasonpurpose/docker-build/)

This repository is the source for Docker AutoBuilds. Get the image on DockerHub: [hub.docker.com/ideasonpurpose/docker-build](https://registry.hub.docker.com/ideasonpurpose/docker-build)

## Running a build from Docker

Example run:

```sh
docker run -p 8080:8080 --env NAME=iop-sscgf --env HOSTNAME=joes-mbp.local -v $PWD:/usr/src/site ideasonpurpose/docker-build npm run devserver
```

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

Tooling runs from `/usr/src/tools` inside the Docker image. Site files are expected to be in `/usr/src/site`

Requesting `/webpack/reload` from the devserver will will trigger a full reload for all connected clients.

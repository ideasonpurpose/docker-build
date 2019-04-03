# Docker Build Tools

This repository is the source for Docker AutoBuilds. Get the image here:

```
url to come.
```

## Running a build from Docker

For now, here's the command to run:

```sh
docker run -p 8080:8080 --env NAME=iop-sscgf --env HOSTNAME=joes-mbp.local -v "\$PWD/../site":/usr/src/site ideaurpose/tools npm run devserver
```

## Todo

Lots.

- config file
- auto-inject local hostname or IP
- Docker autobuilds

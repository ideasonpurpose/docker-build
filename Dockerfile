# Premature to put this in an issue yet, but multi-architecture builds will likely need to
# happen sometime in the near-ish future. Collecting references.
# One initial bug is that the jpegtran-bin and optipng-bin binaries don't compile on Docker on Apple Silicon
# Docker runs as arm64 but there is no pre-built binary and compilation doesn't appear to be working yet
#
# Helpful references:
#   - https://blog.jaimyn.dev/how-to-build-multi-architecture-docker-images-on-an-m1-mac/

# Docker Hub node images:  https://hub.docker.com/_/node
FROM node:16.13.2-buster-slim
# FROM node:14-buster-slim

LABEL version="0.10.0"

# enable color in the terminal
ENV TERM xterm-256color
ENV npm_config_cache /usr/src/site/webpack/.cache

# Disable npm update checks. Not just npm, and no idea where this is documented, but it works
# Well it did before node 16
ENV NO_UPDATE_NOTIFIER true
# Found this solution here: https://stackoverflow.com/a/60525400
# ... but since the Dockerfile runs as root, the setting won't be available to the user
# RUN npm config set update-notifier false
# so do it manually:
RUN echo 'update-notifier=false' > /home/node/.npmrc \
  && chown node:node /home/node/.*
# Alternate method for the future, also from the same SO question: https://stackoverflow.com/a/46879171/503463
# RUN echo '{"optOut": true}' > /home/node/.config/configstore/update-notifier-npm.json

WORKDIR /usr/src/tools

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
      build-essential \
      dh-autoreconf \
      libgl1-mesa-glx \
      libxi6 \
      python \
      jq \
      git \
    && rm -rf /var/lib/apt/lists/*

# will likley need some or all of these for compiling optipng, jpegtran and mozjpeg
      # libpng-dev \
      # libglu1 \
      # zlib1g-dev \
      # nasm

# Install the dart-sass binary, because why not?
# https://github.com/sass/dart-sass/releases/
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
    && rm -rf /var/lib/apt/lists/*
RUN curl -L https://github.com/sass/dart-sass/releases/download/1.49.0/dart-sass-1.49.0-linux-x64.tar.gz > /tmp/dart-sass.tar.gz \
    && tar -C /tmp -xvf /tmp/dart-sass.tar.gz \
    && mv /tmp/dart-sass/sass /usr/local/bin/sass \
    && rm -rf /tmp/dart-sass*

# for node:11-alpine
# RUN apk update && apk add --virtual build-deps build-base git gettext libtool automake autoconf nasm zlib-dev

#
# NETWORK DEBUGGING TOOLS - used for development, disable for production
# RUN apt-get update -qq \
#     && apt-get install -y --no-install-recommends \
#       iputils-ping \
#       dnsutils \
#       curl \
#       vim \
#     && rm -rf /var/lib/apt/lists/*

# Set node cache to use the persistent volume
# RUN npm config set cache /usr/src/site/webpack/.cache

# Ensure we're running the most recent version of npm
RUN npm install -g npm

COPY package*.json ./
RUN npm clean-install
# when debugging, try a regular install instead of clean-install
# RUN npm install

# total voodoo. https://github.com/imagemin/optipng-bin/issues/84#issuecomment-343403097
RUN npm rebuild

COPY webpack.config.js ./
COPY default.config.js ./
COPY zip.js ./
COPY explore.js ./
# COPY browsersync.js ./
COPY lib ./lib

# alpine cleanup:
# run apk del build-deps

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

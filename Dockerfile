# Premature to put this in an issue yet, but multi-architecture builds will likely need to
# happen sometime in the near-ish future. Collecting references.
# One initial bug is that the jpegtran-bin and optipng-bin binaries don't compile on Docker on Apple Silicon
# Docker runs as arm64 but there is no pre-built binary and compilation doesn't appear to be working yet
#
# Helpful references:
#   - https://blog.jaimyn.dev/how-to-build-multi-architecture-docker-images-on-an-m1-mac/

# Docker Hub node images:
# https://hub.docker.com/_/node
# FROM node:18.17.1-bullseye-slim
# FROM node:18.17.1-bookworm-slim
FROM node:20.12-bookworm-slim

LABEL version="0.16.0"

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
      python3 \
      jq \
      git \
    && rm -rf /var/lib/apt/lists/*

# will likley need some or all of these for compiling optipng, jpegtran and mozjpeg
      # libpng-dev \
      # libglu1 \
      # zlib1g-dev \
      # nasm

# Install Dart_SDK then the dart-sass from source
# https://dart.dev/get-dart
# https://github.com/sass/dart-sass/releases/
# RUN apt-get update -qq \
#     && apt-get install -y --no-install-recommends \
#       apt-transport-https \
#       ca-certificates \
#       kgpg \
#       wget \
#     && curl -L https://storage.googleapis.com/dart-archive/channels/stable/release/latest/linux_packages/dart_2.19.6-1_amd64.deb > /usr/src/dart.deb
#     && wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/dart.gpg \
#     && echo 'deb [signed-by=/usr/share/keyrings/dart.gpg arch=amd64] https://storage.googleapis.com/download.dartlang.org/linux/debian stable main' | tee /var/lib/apt/lists/dart_stable.list \
#     && apt-get update -qq \
#     && apt-get install dart \
#     && rm -rf /var/lib/apt/lists/*

# RUN curl -L https://storage.googleapis.com/dart-archive/channels/stable/release/latest/linux_packages/dart_2.19.6-1_amd64.deb > /usr/src/dart.deb \
#       && dpkg --install /usr/src/dart.deb \
#       && rm /usr/src/dart.deb
# RUN curl -L https://github.com/sass/dart-sass/releases/download/1.49.9/dart-sass-1.49.9-linux-x64.tar.gz > /tmp/dart-sass.tar.gz \
#     && tar -C /tmp -xvf /tmp/dart-sass.tar.gz \
#     && mv /tmp/dart-sass/sass /usr/local/bin/sass \
#     && rm -rf /tmp/dart-sass*

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

# Ensure we're running the most recent version of npm in a clean environment
RUN rm -rf node_modules \
    && npm install -g npm

COPY package.json ./
RUN npm install

# sass-embedded decided to install platform-specific dependencies
# so we can't rely on package-lock.json anymore and have to install it
# separately so each platform's docker image will get the correct executable
# This uses `jq` to extract the Sass version from package.json
RUN npm install sass-embedded@$(jq -r .dependencies.sass package.json)

# total voodoo. https://github.com/imagemin/optipng-bin/issues/84#issuecomment-343403097
RUN npm rebuild

# What needs to write to cache? https?
RUN chmod 0755 /usr/src/tools/node_modules/

COPY webpack.config.js ./
COPY default.config.js ./
COPY clean.js ./
COPY zip.js ./
COPY explore.js ./
# COPY browsersync.js ./
COPY lib ./lib

# alpine cleanup:
# run apk del build-deps

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

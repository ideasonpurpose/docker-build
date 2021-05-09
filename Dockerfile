# TODO: node-sass doesn't compile on node v16 yet: https://github.com/sass/node-sass/issues/3077
FROM node:16.1.0-buster-slim
# FROM node:14.16.1-buster-slim

LABEL version="0.9.2"

# enable color in the terminal
ENV TERM xterm-256color
ENV npm_config_cache /usr/src/site/webpack/.cache

# Disable npm update checks. Not just npm, and no idea where this is documented, but it works
# Well it did before node 16
# ENV NO_UPDATE_NOTIFIER true
# Found this solution here: https://stackoverflow.com/a/60525400
RUN npm config set update-notifier false

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

      # zlib1g-dev \
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

COPY package*.json ./
# RUN npm clean-install
RUN npm install

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

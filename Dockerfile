FROM node:12-slim

LABEL version="0.2.0"

# enable color in the terminal
ENV TERM xterm-256color

WORKDIR /usr/src/tools

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
      build-essential \
      libgl1-mesa-glx \
      libxi6 \
      python \
      jq \
      git \
    && rm -rf /var/lib/apt/lists/*

# for node:11-alpine
# RUN apk update && apk add --virtual build-deps build-base git gettext libtool automake autoconf nasm zlib-dev

#
# NETWORK DEBUGGING TOOLS
# TODO: Remove or disable if not needed
#
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
      iputils-ping \
      dnsutils \
      vim \
    && rm -rf /var/lib/apt/lists/*


COPY package*.json ./
RUN npm clean-install

COPY webpack.config.js ./
COPY default.config.js ./
COPY zip.js ./
COPY explore.js ./
COPY browsersync.js ./
COPY lib ./lib

# run apk del build-deps

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

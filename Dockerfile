FROM node:11-slim
#FROM node:11-alpine

# enable color in the terminal
ENV TERM xterm-256color

WORKDIR /usr/src/tools

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
      build-essential \
      libgl1-mesa-glx \
      jq \
    && rm -rf /var/lib/apt/lists/*

# for node:11-alpine
# RUN apk update && apk add --virtual build-deps build-base git gettext libtool automake autoconf nasm zlib-dev

COPY package*.json ./
RUN npm clean-install

COPY webpack.config.js ./
COPY zip.js ./

# run apk del build-deps

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]

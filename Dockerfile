FROM node:11
#FROM node:11-alpine

# enable color in the terminal
ENV TERM xterm-256color

WORKDIR /usr/src/tools
COPY package*.json ./
COPY webpack.config.js ./
COPY zip.js ./

# RUN apt-get update
# RUN apt-get install libgl
# RUN npm install

# for node:11
# RUN rm -rf /var/lib/apt/lists/*
RUN apt-get update -qq \
    && apt-get install -y libgl1-mesa-glx

# for node:11-alpine
# RUN apk update && apk add --virtual build-deps build-base git gettext libtool automake autoconf nasm zlib-dev

RUN npm clean-install

# run apk del build-deps

# CMD ["build"]
# ENTRYPOINT ["echo", "hello"]

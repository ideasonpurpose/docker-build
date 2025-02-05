# Docker Build Tools

#### Version 0.17.2

<!--[![dockeri.co](https://dockeri.co/image/ideasonpurpose/docker-build)](https://hub.docker.com/r/ideasonpurpose/docker-build)<br> -->

[![Docker Pulls](https://img.shields.io/docker/pulls/ideasonpurpose/docker-build?logo=docker&logoColor=white)](https://hub.docker.com/r/ideasonpurpose/docker-build)
[![Push to DockerHub](https://img.shields.io/github/actions/workflow/status/ideasonpurpose/docker-build/dockerhub.yml?logo=github&logoColor=white&label=Push%20to%20DockerHub)](https://github.com/ideasonpurpose/docker-build)
[![Coverage Status](https://coveralls.io/repos/github/ideasonpurpose/docker-build/badge.svg?branch=master)](https://coveralls.io/github/ideasonpurpose/docker-build?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/a6fabc9730a3b90b255c/maintainability)](https://codeclimate.com/github/ideasonpurpose/docker-build/maintainability)

This repository is the source for our local Docker-based WordPress development environment, it can be used for themes and plugins. Get the image on DockerHub: [hub.docker.com/r/ideasonpurpose/docker-build](https://hub.docker.com/r/ideasonpurpose/docker-build)

## Configuration

Each project should define a basic configuration object in a file named _ideasonpurpose.config.js_. The default configuration object looks like this:

```js
module.exports = {
  src: "./src",
  dist: "./dist",
  entry: ["./js/index.js"],
  publicPath: "/assets/dist/",
};
```

### Config object

#### `src`

The filesystem path to the directory where assets source files can be found.

#### `dist`

The filesystem path to the output directory where Webpack will generate files.

#### `entry`

This can be an array of paths, a string path or a pre-configured Webpack entry object. For arrays, named entry points will be extrapolated from each entry's basename. Strings will be treated as single-element arrays. Objects will passthrough unchanged.

#### `publicPath`

This is the public url path to the dist folder. Web browsers will reference our generated assets from this location. These paths are visible in the generated manifest. Paths are joined naively, you'll probably want to include a trailing slash.

#### `sass` (optional)

Specify the Sass implementation for [Sass-loader][]. Supports `sass-embedded` ([embedded-host-node][], native) and `sass` ([js-compiled Dart-sass][]). Default: **`sass-embedded`**,  [`node-sass`][] is no longer supported

#### `proxy` (optional)

When set, Webpack's devserver will proxy this server, replacing requested assets as appropriate.

#### `transpileDependencies` (optional)

A list NPM modules which should be transpiled by babel. Many useful packages on NPM ship es6 code which crashes on older browsers. List those modules here so they can be included in the transpilation pipeline.

#### `devtool` (optional)

This value is passed directly into the webpack config. Use it to experiment with different [source-map generation settings](https://webpack.js.org/configuration/devtool/).

### WordPress config

For WordPress sites, the config file will look something like this:

```js
const pkg = require("./package.json");

module.exports = {
  src: `./wp-content/themes/${pkg.name}/src`,
  dist: `./wp-content/themes/${pkg.name}/dist`,
  entry: ["./js/main.js", "./js/admin.js", "./js/editor.js"],
  publicPath: `/wp-content/themes/${pkg.name}/dist/`,
};
```

<!--
### Jekyll config

For Jekyll projects, the config will look something like this:

```js
module.exports = {
  src: `./_assets/`,
  dist: `./dist/`,
  entry: ["./js/main.js"],
  publicPath: `/dist/`,
  contentBase: "/_site/", // Location webpack devServer will serve static files from
  manifestFile: "../_data/dependency-manifest.json", // Write the dependency-manifest into _data
};
```
-->

## Running a build from Docker

### Example runs

#### Mac/Linux

```sh
$ docker run -p 8080:8080 --env NAME=iop-sscgf --env HOSTNAME=joes-mbp.local -v $PWD:/usr/src/site ideasonpurpose/docker-build npm run build
```

This can also be run with `npm run build`

#### Windows Command Line

```cmd
$ docker run -p 8080:8080 --env NAME=iop-sscgf --env HOSTNAME=joes-mbp.local -v %cd%:/usr/src/site ideasonpurpose/docker-build npm run build
```

> Notes: The only difference between the POSIX and Windows commands is the using the Windows' varible `%cd%` instead of `$PWD`.
>
> If Windows throws a "driver failed programming external connectivity on endpoint" error, restart Docker. See [docker/for-win#2722](https://github.com/docker/for-win/issues/2722)

### Commands

#### `build`

Runs a webpack production build. This will also generate a zipped snapshot. _(todo: does this work?)_

#### `start`

Builds assets, starts the Webpack DevServer and watches files for changes.

### Environment vars

#### `NAME`

The name of the project, ideally the `name` property from package.json. This should match the directory containing the project files.

### Volumes

Mount the project's web root directory to `/usr/src/site`

## Notes

> Documentation notes to be cleaned up

Tooling runs from `/usr/src/tools` inside the Docker image. Site files are expected to be mounted to `/usr/src/site`

Requesting [`/webpack/reload`](http://localhost:8080/webpack/reload) from the devserver will will trigger a full reload for all connected clients.

### Code Splitting and deferred loading

Code splitting is automatic, required libraries will be de-duped and loaded from a shared module. These are specified in the dependency-manifest file.

Deferred dynamic imports also work. To use these, follow the example in the [Webpack API docs](https://webpack.js.org/api/module-methods/#import-1):

```js
if (some.condition) {
  import("./other-file.js").then((module) => {
    // access any exports from module here
  });
}
```

### Image Handling

Images found in `/src` will be processed as follows:

- **.jpg** - Optimized with Sharp, [Mozjpeg defaults](https://sharp.pixelplumbing.com/api-output#jpeg), 77% quality
- **.png** - [Sharp defaults](https://sharp.pixelplumbing.com/api-output#png)
- **.svg** - Copied without processing

Images required into JS source files will be processed by webpack as [general assets](https://webpack.js.org/guides/asset-modules/#general-asset-type) with the following additions:

- **.jpg**
- **.svg** - Available as SVGR

In practice, automated SVG processing was found to be more of a hindrance than helpful. More often it was easier to manually pre-process the files using SVGO, selectively preserving structure and attributes on a per-file basis.

### Local Development

To iterate locally, build the image using the same name as the Docker Hub remote. Docker will use the local copy. Specify `dev` if you're using using versions.

```sh
docker build . --tag ideasonpurpose/docker-build:dev
```

Tooling can be used outside of Docker by creating a sibling `site` directory alongside the checkout of this project. For existing projects, set the `NAME` envvar to the theme name before the command like this: `NAME=example-theme npm run webpack`.

Also note that `NODE_ENV` will default to `development` so be sure to set it to `production` when testing builds: `NAME=example-theme NODE_ENV=production npm run webpack`

### Debugging webpack

It's possible to debug webpack inside the container by calling `npm run start:debug` instead of the regular `start` command. The build tools will start and report to be listening on port 9229, like this:

```
Debugger listening on ws://0.0.0.0:9229/ddd8e8e2-0cc9-4163-9a13-dc21579af829
For help, see: https://nodejs.org/en/docs/inspector
```

Open the Node debugger in Chrome or Edge developer console and there should be a little green hexagon Node.js icon in the upper right next to the Select Element and Device Emulation icons. Click that to attach to the debugger, find the files in the sidebar and add some breakpoints.

Things that aren't working yet: Code changes, VS Code's debugger. But this does allow breakpoints and deep inspection of the running webpack instance.

The **zip.mjs** script can be debugged in VS Code using the **Debug zip.mjs** launch config. It should appear in the VS Code Run and Debug menu.

## Related Projects

This toolset is installed with our [Docker-based WordPress development environments][docker-wordpress-dev].

## &nbsp;

#### Brought to you by IOP

<a href="https://www.ideasonpurpose.com"><img src="https://raw.githubusercontent.com/ideasonpurpose/ideasonpurpose/master/iop-logo-white-on-black-88px.png" height="44" align="top" alt="IOP Logo"></a><img src="https://raw.githubusercontent.com/ideasonpurpose/ideasonpurpose/master/spacer.png" align="middle" width="4" height="54"> This project is actively developed and used in production at <a href="https://www.ideasonpurpose.com">Ideas On Purpose</a>.


[sass-loader]: https://webpack.js.org/loaders/sass-loader/
[node-sass]: https://github.com/sass/node-sass
[dart-sass]: https://github.com/sass/dart-sass
[embedded-host-node]: https://github.com/sass/embedded-host-node
[cosmiconfig]: https://www.npmjs.com/package/cosmiconfig
[docker-wordpress-dev]: https://github.com/ideasonpurpose/docker-wordpress-dev

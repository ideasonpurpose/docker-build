# Docker Build Tools

#### Version 0.3.1

[![dockeri.co](https://dockeri.co/image/ideasonpurpose/docker-build)](https://hub.docker.com/r/ideasonpurpose/docker-build)

This repository is the source for Docker AutoBuilds. Get the image on DockerHub: [hub.docker.com/r/ideasonpurpose/docker-build](https://hub.docker.com/r/ideasonpurpose/docker-build)

## Configuration

Each project should define a basic configuration object in a file named _ideasonpurpose.config.js_. The default configuration object looks like this:

```js
module.exports = {
  src: "./src",
  dist: "./dist",
  entry: ["./js/index.js"],
  publicPath: "/dist/",
  proxy: null,
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

Specify the Sass implementation to use. Used by [Sass-loader][]. Supports `node-sass` ([LibSass][]) and `sass` ([Dart-sass][])

#### `proxy` (optional)

When set, Webpack's devserver will proxy this server, replacing requested assets as appropriate.

<!-- TODO: Defaults? Options? -->

### WordPress config

For WordPress sites, the config file will look something like this:

```js
const pkg = require("./package.json");

module.exports = {
  src: `./wp-content/themes/${pkg.name}/src`,
  dist: `./wp-content/themes/${pkg.name}/dist`,
  entry: ["./js/main.js", "./js/admin.js", "./js/editor-blocks.js"],
  publicPath: "/_assets/dist/",
  proxy: `${pkg.name}.test`,
};
```

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

Known script commands can be executed using just their name, no need to prefix with `npm run`.

#### `build`

Runs a webpack production build. This will also generate a zipped snapshot. _(todo: does this work?)_

#### `start`

Builds assets, starts the Webpack DevServer and watches files for changes.

#### `analyze`

Runs a webpack production build then starts the Webpack Bundle Analyzer. Connect a local port to 8080 to view.

### Environment vars

#### `NAME`

The name of the project, ideaslly the `name` property from package.json. This should match the directory containing the project files.

### Volumes

Mount the project's web root directory to `/usr/src/site`

## Todo

- config file (load `/usr/src/site/_config.yml` from our webpack config)
- ~~Shrink image, start from node:11-slim or node:11-alpine~~
- ~~auto-inject local hostname or IP~~
- ~~Docker autobuilds~~

## Notes

> Documentation notes to be cleaned up

Tooling runs from `/usr/src/tools` inside the Docker image. Site files are expected to be mounted to `/usr/src/site`

Requesting `/webpack/reload` from the devserver will will trigger a full reload for all connected clients.

The config object can include additional sources/entry-points, (todo: name this better) include an array of relative source files like this:

```js
```

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

### Local Development

To iterate locally, build the image using the same name as the Docker Hub remote. Docker will use the local copy.

```sh
$ docker build . --tag ideasonpurpose/docker-build
```

[sass-loader]: https://webpack.js.org/loaders/sass-loader/
[libsass]: https://github.com/sass/node-sass
[dart-sass]: https://github.com/sass/dart-sass
[cosmiconfig]: https://www.npmjs.com/package/cosmiconfig

/**
 * This is the default config. It should be overridden by a file
 * named `ideasonpurpose.config.js` in the project root.
 *
 * @property {string} src - The location of a projects source files. <br>
 *     These are the files which will be compiled to generate the <br>
 *     deliverable js, css and image files.
 * @property {string} dist - The location where files will be output after processing <br>
 *
 * @property {(array|string|object)} entry - This should preferably be an array, but <br>
 *     strings or objects will also work. Strings will be treated as a single-item array. <br>
 *     Arrays be parsed into an object, objects (or whatever) will be passed through. <br>
 *     Entry filepaths are relative to the `src` path.
 *
 * @property {string} publicPath - The base path for all assets. Passed directly to Webpack
 *
 * @property {string} contentBase - Directory of static content to be served by Webpack DevServer
 *
 * @property {string} manifestFile - Filepath location of the dependency-manifest JSON file
 *
 * @property {boolean|null|string} proxy - This setting can be used to disable the proxy or override
 *      the default which points to the internal IP address of of docker WordPress service. The purpose
 *      is to connect the build tools to a backend server so pages which need to be processed, like
 *      WordPress, can be served from a known backend with front-end assets being built, injected and
 *      reloaded by webpack.
 *
 *      - IP addresses will have a protocol added. (eg. 10.1.0.25 will be used as http://10.1.0.25)
 *      - Strings which don't start with http/https will attempt to be resolved as hostnames.
 *        Use this for alternate services, the default, 'wordpress' is treated this way since it
 *        will be resolved internally by Docker.
 *      - Url-ish strings will be used as is with no validation.
 *
 *      Simple names may cause issues as page contents will be rewritten to replace the default url
 *      with this value.
 *
 * @property {string} [sass=sass-embedded] - The Sass implementation to use<br>
 *      Supports Node-sass and Dart-Sass (sass-embedded)
 *      {@link https://github.com/sass/dart-sass|Dart-Sass (canonical Sass)}
 *      {@link https://github.com/sass/embedded-host-node|Sass-Embedded (native dart-Sass)}
 *
 * @property {array|string} transpileDependencies - List of dependencies to be transpiled by Babel.
 *      Based on the setting in Vue. Two modules, ansi-regex and normalize-url, are included by
 *      default since they're part of webpack DevServer and have been known to cause issues.
 *      {@link https://cli.vuejs.org/config/#transpiledependencies|transpileDependencies }
 *      TODO: This might be obsolete after updates to webpack-dev-server (2021-03)
 *
 * @property {boolean|string} [devtool=false] - An option for webpack devtool. Had a lot of problems
 *      with this so it's sort of here to punch a hole in the config for experimentation.
 *      {@link https://webpack.js.org/configuration/devtool/#devtool|webpack devtool options}
 *      TODO: Pick a better default than false
 *
 * @example <caption>defaultConfig.entry examples</caption>
 * // A setting like this:
 *   [ "./js/index.js" ]
 *
 * // Yields an entry object like this:
 *  { index: "./js/index.js"}
 *
 * // A string will be wrapped in an array:
 *   "./js/main.js"  =>  [ "./js/main.js" ]
 *
 * // Objects pass straight through
 *   { app: "./js/main.js", index: ["./js/index.js", "./sass/index.scss"] }
 *
 * // Overlapping basenames will be joined into a single entrypoint
 *   ["./index.js", "./app.js", "./index.scss"]  =>  { app: ["./app.js"], index: ["./index.js", "./index.scss"]}
 */

const defaultConfig = {
  src: "./src",
  dist: "./dist",
  entry: ["./js/index.js"],
  publicPath: "/dist/",
  contentBase: "/dist/", // TODO: Should this be false?
  manifestFile: "./dependency-manifest.json",
  sass: "sass-embedded",
  port: 8080,
  transpileDependencies: ["ansi-regex", "normalize-url"],
  proxy: 'wordpress',
};

// module.exports = defaultConfig;

export default defaultConfig;

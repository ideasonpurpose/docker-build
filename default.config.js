/**
 * This is the default config. It should be overridden by a file
 * named `ideasonpurpose.config.js` in the project root.
 *
 * @property {string} src - The location of a projects source files. <br>
 *     These are the files which will be compiled to generate the <br>
 *     deliverable js, css and image files.
 * @property {string} dist - The location where files will be output after processing <br>
 *
 * @property {array|string|object} entry - This should preferrably be an array, but <br>
 *     strings or objects will also work. Strings will be treated as a single-item array. Arrays
 * be parsed into an object, objects (or whatever) will be passed through.
 *
 * @property {string} publicPath - The base path for all assets. Passed directly to Webpack
 *
 * @property {boolean|null|string} proxy - TBD will be used to configure the proxy <br>
 *      TODO: This should be automatic, maybe valid entries are: true, false, null, string (a valid url)?
 *
 * @example <caption>defaultConfig.entry examples</caption>
 * // A setting like this:
 *   [ "./js/index.js" ]
 *
 * // Yields an entry object like this:
 *  { index: "./js/index.js"}
 *
 * //A string will be wrapped in an array:
 *   "./js/main.js"  =>  [ "./js/main.js" ]
 *
 * // Objects pass stright through
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
  proxy: null // TODO this doesn't do much yet, make devServer condtional
};

module.exports = defaultConfig;



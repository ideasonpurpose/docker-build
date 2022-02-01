// const fs = require("fs-extra");
// const path = require("path").posix;



import fs from "fs-extra";
import {posix as path} from "path";

import chalk from "chalk";
// const chalk = require("chalk");

// const defaultConfig = require("../default.config.js");

import defaultConfig from "../default.config.js";

/**
 * This file encapsulates all the config file massaging and allows
 * for asynchronous values.
 *
 * Asynchronous values:
 *  -
 */
// module.exports = (configFile = { config: {} }) => {
export default  (configFile = { config: {} }) => {
  /**
   * Merge configFile onto defaults
   */
  const config = { ...defaultConfig, ...configFile.config };

  /**
   * Merge transpileDependency arrays
   */
  if (configFile.config.transpileDependencies) {
    const configDeps =
      typeof configFile.config.transpileDependencies === "string"
        ? [configFile.config.transpileDependencies]
        : configFile.config.transpileDependencies;
    config.transpileDependencies = [
      ...defaultConfig.transpileDependencies,
      ...configDeps,
    ];
  }

  /**
   * Normalize paths relative to our webpack.config.js file
   *
   * Tools live in /usr/src/tools
   * Site is linked to /src/src/site
   */
  config.src = path.resolve("../site", config.src);
  config.dist = path.resolve("../site", config.dist);

  /**
   * Check for `config.src` and create it if missing
   */
  if (!fs.existsSync(config.src)) {
    console.log(
      "The src directory " + chalk.cyan(config.src) + " does not exist."
    );
    // TODO: Make this optional? User prompt? Throw error?
    // TODO: This is a massive side-effect which makes testing very difficult
    // fs.ensureDirSync(config.src);
  }

  /**
   * Generate an entry object from config.entry.
   * Output names will be based on the source file's basename.
   *
   * Config.entry should preferably be an array, but strings or objects will
   * also work. Strings will be treated as a single-item array. Arrays will be
   * parsed into an object, objects (or whatever) will pass through unmodified.
   *
   * A setting like this:
   *   [ "./js/index.js" ]
   *
   * Yields an entry object like this:
   *  { index: "./js/index.js"}
   *
   * A string will be wrapped in an array:
   *   "./js/main.js"  =>  [ "./js/main.js" ]
   *
   * Objects pass straight through
   *   { app: "./js/main.js" }
   *
   * Overlapping basenames will be joined into a single entrypoint
   *   ["./index.js", "./app.js", "./index.scss"]  =>  { app: ["./app.js"], index: ["./index.js", "./index.scss"]}
   */
  if (typeof config.entry === "string") {
    config.entry = [config.entry];
  }
  if (Array.isArray(config.entry)) {
    config.entry = config.entry.reduce((obj, src) => {
      obj[path.parse(src).name] = []
        .concat(obj[path.parse(src).name], src)
        .filter((i) => i);
      return obj;
    }, {});
  }

  /**
   * Normalize the sass implementation
   * SassImplementations contains known keys with an array of accepted values
   */
  const sassInput = config.sass.toString().toLowerCase();
  config.sass = false;
  const sassImplementations = {
    sass: ["dart-sass", "sass"],
    "node-sass": ["node-sass"],
    "sass-embedded": ['sass-embedded', 'embedded'],
  };
  Object.entries(sassImplementations).forEach(([key, values]) => {
    if (values.includes(sassInput)) {
      config.sass = key;
      return;
    }
  });

  /**
   * Remap proxy: true to default value
   */
  if (config.proxy === true) {
    config.proxy = defaultConfig.proxy;
  }

  return config;
};

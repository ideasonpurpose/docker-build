import fs from "fs-extra";
import { posix as path } from "path";
import chalk from "chalk";

import defaultConfig from "../default.config.js";

/**
 * This file encapsulates all the config file massaging and allows
 * for asynchronous values.
 *
 * Asynchronous values:
 *  -
 */

export default (configFile = { config: {} }) => {
  /**
   * This is a temporary workaround for a problem with using `process.env.NAME` in
   * base ideasonpurpose.config.js files. `NAME` is often set in the environment
   * and will override the value in package.json, resulting in orphan folders and
   * misnamed archives.
   *
   * TODO: This warning can be removed once all process.env.NAME assignments are removed
   * removed from project configuration files.
   */
  if (configFile.filepath) {
    const rawConfigFile = fs.readFileSync(configFile.filepath);
    const packageJson = fs.readJsonSync(
      path.resolve(configFile.filepath, "../package.json")
    );
    // console.log({ p: process.env.NAME });
    if (
      packageJson.name !== process.env.NAME &&
      rawConfigFile.includes("process.env.NAME") &&
      configFile.config.src.includes(process.env.NAME)
    ) {
      nameEnvVarWarning();
    }
  }

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
   * Normalize paths relative to the configFile
   *
   * When used with ideasonpurpose/docker-wordpress-dev the environment
   * is set up like this:
   *
   * - Tools live in /usr/src/tools
   * - Site is linked to /src/src/site
   *
   * placeholder.file is a sloppy workaround for needing a path ending in a file.
   * This lets us move up a level in the same way we could if cosmiConfig returned
   * the path to a config.js or package.json file.
   */
  configFile.filepath = configFile.filepath || "../site/placeholder.file";
  config.src = path.resolve(configFile.filepath, "..", config.src);
  config.dist = path.resolve(configFile.filepath, "..", config.dist);

  /**
   * Check for `config.src` and create it if missing
   * TODO: unresolved, create the file? Fail? Throw error?
   */
  if (!fs.existsSync(config.src)) {
    noSrcExists(config.src);
    // TODO: Make this optional? User prompt? Throw error?
    // TODO: This is a massive side-effect which makes testing very difficult
    // fs.ensureDirSync(config.src);
    // throw new Error();
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
    sass: ["sass"],
    "node-sass": ["node-sass"],
    "sass-embedded": ["dart-sass", "sass-embedded", "embedded"],
  };
  Object.entries(sassImplementations).forEach(([key, values]) => {
    if (sassInput === "dart-sass") {
      dartSassWarning();
    }

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

/**
 * Warnings are broken out below
 */
const noSrcExists = (src) => {
  console.log(
    "🛑 ",
    chalk.bold.red(
      `ERROR: The src directory ${chalk.white(src)} does not exist.`
    )
  );
};

const dartSassWarning = () => {
  console.log(
    "⚠️ ",
    chalk.bold.yellow("NOTICE: The"),
    chalk.bold.magenta('"dart-sass"'),
    chalk.bold.yellow("Sass configuration setting has changed")
  );
  console.log(
    chalk.yellow(
      '   Sass options have been updated and "dart-sass" is now an alias'
    )
  );
  console.log(
    chalk.yellow(
      '   for the native "sass-embedded" package. To continue using the'
    )
  );
  console.log(
    chalk.yellow(
      '   the cross-compiled "sass" npm package instead, please update the'
    )
  );
  console.log(chalk.yellow("   project's config file."));
};

const nameEnvVarWarning = () => {
  console.log(
    "⚠️ ",
    chalk.yellow.bold(
      "WARNING: $NAME is set in the environment and the project's config file."
    )
  );
  console.log(
    chalk.yellow(
      "   The value of $NAME will likely conflict with the name property from"
    )
  );
  console.log(
    chalk.yellow(
      "   package.json. Please update the project's config.js file. To silence  "
    )
  );
  console.log(
    chalk.yellow(
      "   this message, set $NAME in the environment to match the project's"
    )
  );
  console.log(chalk.yellow("   package.json `name` property."));
};

// import url from "url";
import { dirname, relative, resolve } from "path";
import { fileURLToPath } from "node:url";

import { cosmiconfigSync } from "cosmiconfig";

import chalk from "chalk";
import buildConfig from "./lib/buildConfig.js";

import { deleteAsync } from "del";

/**
 * This script expects to the site to live in /usr/src/site/ to
 * match the webpack config. It can also be called with a single
 * path argument which will be evaluated relative to the script.
 * This can be used for testing, or to bundle any directory while
 * excluding src, node_modules, etc.
 */
let siteDirBase = process.argv[2] || "/usr/src/site/";
siteDirBase += siteDirBase.endsWith("/") ? "" : "/";
const siteDir = new URL(siteDirBase, import.meta.url);

// // TODO: This blob appears here and in zip.js. refactor it somewhere
// const fallbackConfig = { config: {}, filepath: siteDir.pathname };
// const explorerSync = cosmiconfigSync("ideasonpurpose");
// const configFile = explorerSync.search(siteDir.pathname) || fallbackConfig;
// // const configFileUrl = url.pathToFileURL(configFile.filepath);
// const config = buildConfig(configFile);

// const explorerSync = cosmiconfigSync("ideasonpurpose");
// const configFile = explorerSync.search(siteDir);

// console.log({ meta: import.meta.url, siteDir, fu: fileURLToPath(siteDir) });

import siteConfig from "../site/ideasonpurpose.config.js";
const configFile = {
  filepath: fileURLToPath(
    new URL("../site/ideasonpurpose.config.js", import.meta.url)
  ),
};

// new URL("../site/ideasonpurpose.config.js", import.meta.url);

// console.log({ configFile });

// const config = buildConfig(configFile ?? siteConfig);
const config = buildConfig({ config: siteConfig });

const relPath = relative(dirname(configFile.filepath), config.dist);

console.log({ dist: config.dist, relPath });

console.log("🚮", chalk.yellow("Cleaning"), chalk.magenta(relPath));
deleteAsync([`${config.dist}/*/`, `${config.dist}/*`], {
  force: true,
  dryRun: false,
}).then((result) => {
  const nfiles = result.length === 1 ? "1 file" : `${result.length} files`;
  console.log("✅", chalk.yellow("Done!"), chalk.gray(`(Removed ${nfiles})`));
});

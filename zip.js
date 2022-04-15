import fs from "fs-extra";
import { posix as path } from "path";
import url from "url";

import archiver from "archiver";
import chalk from "chalk";
import { cosmiconfigSync } from "cosmiconfig";
import filesize from "filesize";
import { globby } from "globby";
import isTextPath from "is-text-path";
import cliTruncate from "cli-truncate";
import stringLength from "string-length";
import replaceStream from "replacestream";

import buildConfig from "./lib/buildConfig.js";
import { prettierHrtime } from "./lib/prettier-hrtime.js";

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

const explorerSync = cosmiconfigSync("ideasonpurpose");
const configFile = explorerSync.search(siteDir.pathname) || {
  config: {},
  filepath: siteDir.pathname,
};
const configFileUrl = url.pathToFileURL(configFile.filepath);
const config = buildConfig(configFile);

const packageJson = fs.readJsonSync(new URL("package.json", configFileUrl));
packageJson.version ??= "";

const archiveName = packageJson.name || "archive";

const versionDirName = packageJson.version
  ? `${archiveName}-${packageJson.version}`.replace(/[ .]/g, "_")
  : archiveName;

const zipFileName = `${versionDirName}.zip`;
const zipFile = new URL(`_builds/${zipFileName}`, configFileUrl).pathname;

fs.ensureFileSync(zipFile);
const output = fs.createWriteStream(zipFile);

output.on("finish", finishReporter);

const archive = archiver("zip", { zlib: { level: 9 } });
archive.pipe(output);

console.log(chalk.bold("Bundling Project for Deployment"));
const start = process.hrtime();

/**
 * Set projectDir to the parent directory of config.src, all bundled
 * files will be found relative to this.
 */
const projectDir = new URL(`${config.src}/../`, configFileUrl);

/**
 * Counters for total uncompressed size and number of files
 * and a re-usable scoped continuer for file info
 */
let inBytes = 0;
let fileCount = 0;

const globOpts = { cwd: projectDir.pathname, nodir: false };
globby(["**/*", "!src", "!_builds", "!**/*.sql", "!**/node_modules"], globOpts)
  .then((fileList) => {
    /**
     * Throw an error and bail out if there are no files to zip
     */
    if (!fileList.length) {
      throw new Error("No files found.");
    }
    return fileList;
  })
  .then((fileList) =>
    fileList.map((f) => {
      const file = {
        path: f,
        stat: fs.statSync(new URL(f, projectDir)),
        contents: fs.createReadStream(path.join(globOpts.cwd, f)),
      };

      /**
       * Replace the dev folder name with the versioned folder name in hard-coded
       * include paths. These replacements are only run against webpack's compiled
       * assets and Composer's generated autoloaders.
       */
      if (isTextPath(f)) {
        const devPath = new RegExp(`wp-content/themes/${archiveName}/`, "gi");

        file.contents = file.contents.pipe(
          replaceStream(devPath, `wp-content/themes/${versionDirName}/`)
        );
      }

      file.contents.on("data", (chunk) => {
        inBytes += chunk.length;
      });

      file.contents.on("end", () => foundReporter(file));

      /**
       * Adding a data handler changes a stream's mode from paused to flowing
       * so we need to change it back or the streams will be truncated
       */
      file.contents.pause();
      return file;
    })
  )
  .then((fileList) =>
    fileList.map((f) =>
      archive.append(f.contents, {
        name: f.path,
        prefix: versionDirName,
      })
    )
  )
  .then(() => archive.finalize())
  .catch(console.error);

function foundReporter(file) {
  fileCount += 1;
  let outString = [
    "🔍 ",
    chalk.yellow("Found"),
    chalk.magenta(fileCount),
    chalk.yellow("files..."),
    chalk.gray(`(Uncompressed: ${filesize(inBytes)}) `),
  ].join(" ");

  /**
   * calculate width of terminal then shorten paths
   */
  const cols = process.stdout.columns - stringLength(outString) - 1;
  outString += chalk.blue(cliTruncate(file.path, cols, { position: "middle" }));

  if (fileCount % 25 == 0) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(outString);
  }
}

function finishReporter() {
  const outBytes = archive.pointer();
  const end = process.hrtime(start);
  const duration = prettierHrtime(end);
  const savedBytes = inBytes - outBytes;
  const savedPercent = ((1 - outBytes / inBytes) * 100).toFixed(2);

  process.stdout.clearLine();
  process.stdout.cursorTo(0);

  console.log(
    "🔍 ",
    chalk.yellow("Found"),
    chalk.magenta(fileCount),
    chalk.yellow("files"),
    chalk.gray(`(Uncompressed: ${filesize(inBytes)})`)
  );
  console.log(
    "📦 ",
    chalk.yellow("Created"),
    chalk.magenta(filesize(outBytes)),
    chalk.yellow("Zip archive"),
    chalk.gray(`(Saved ${filesize(savedBytes)}, ${savedPercent}%)`)
  );
  console.log(
    "🎁 ",
    chalk.yellow("Theme archive"),
    chalk.magenta(
      `${path.basename(path.dirname(zipFile))}/${chalk.bold(zipFileName)}`
    ),
    chalk.yellow("created in"),
    chalk.magenta(duration)
  );
  console.log("⏳");
  console.log(
    "🚀 ",
    chalk.bold(`Remember to push to ${chalk.cyan("GitHub!")}`)
  );
  console.log("✨");
}

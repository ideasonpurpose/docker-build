import fs from "fs-extra";
import { posix as path } from "path";
import chalk from "chalk";
import ora from "ora";
import filesize from "filesize";
import replaceStream from "replacestream";
import isTextPath from "is-text-path";
// import prettyHrtime from "pretty-hrtime";
import { globby } from "globby";
import archiver from "archiver";
import { cosmiconfigSync } from "cosmiconfig";

import { prettierHrtime } from "./lib/prettier-hrtime.mjs";

/**
 * This is usually run from the Docker image, which will always
 * mount tools at /usr/src/tools and the site at /usr/src/site
 *
 * But for testing, we should be able to use any directory...
 * but it's easiest to create a sibling directory named "site"
 * and to just use that.
 */
// const siteDir = path.resolve(__dirname, "../site");
// const siteDir = new URL("../site", import.meta.url).pathname;
const siteDir = new URL("../site", import.meta.url);
const explorerSync = cosmiconfigSync("ideasonpurpose");
const configFile = explorerSync.search(siteDir.pathname) || { config: {} };

import buildConfig from "./lib/buildConfig.js";

const config = buildConfig(configFile);

const packageJson = fs.readJsonSync(new URL("./package.json", import.meta.url));
const archiveName = process.env.NAME || packageJson.name || "archive";

const archive = archiver("zip", { zlib: { level: 9 } });

const versionDirName = packageJson.version
  ? `${archiveName}-${packageJson.version}`.replace(/[ .]/g, "_")
  : archiveName;

const zipFileName = `${versionDirName}.zip`;
// const zipFile = path.resolve(siteDir, `_builds/${versionDirName}.zip`);
const zipFile = new URL(`./_builds/${zipFileName}`, siteDir).pathname;

let inBytes = 0;
let fileCount = 0;

// TODO: Module
// const prettierHrtime = (hrtime) => {
//   let timeString;
//   const seconds = hrtime[1] > 5e6 ? " seconds" : " second";
//   if (hrtime[0] > 60) {
//     timeString = prettyHrtime(hrtime, { verbose: true })
//       .replace(/\d+ (milli|micro|nano)seconds/gi, "")
//       .trim();
//   } else if (hrtime[1] > 5e6) {
//     timeString = prettyHrtime(hrtime).replace(/ s$/, seconds);
//   } else {
//     timeString = prettyHrtime(hrtime);
//   }
//   return timeString;
// };

console.log(chalk.bold("Bundling Project for Deployment"));
const spinner = new ora({ text: "Collecting files..." });
// spinner.start("Compressing...");

fs.ensureFileSync(zipFile);
const output = fs.createWriteStream(zipFile);

output.on("finish", () => {
  const outBytes = archive.pointer();
  const end = process.hrtime(start);
  const duration = prettierHrtime(end);

  spinner.succeed(
    `Found ${fileCount} files ` +
      chalk.gray(`(Uncompressed: ${filesize(inBytes)})`)
  );
  spinner.start("Compressing...");
  spinner.succeed("Compressing... Done!");
  spinner.succeed(
    // `${chalk.bold(path.basename(zipFile))} created in ${duration}.` +
    `${chalk.bold(zipFileName)} created in ${duration}.` +
      chalk.gray(
        `(${filesize(outBytes)} archive.`,
        `Saved ${filesize(inBytes - outBytes)}`,
        `- ${((outBytes / inBytes) * 100).toFixed(2)}%)`
      )
  );
});

const start = process.hrtime();

archive.pipe(output);

// const projectDir = path.resolve(siteDir, config.src, "../");
// const projectDir2 = new URL("../", import.meta.url);

// TODO:  projectDir = NEEDS TO BE THE PARENT directory of srcDir from config!!

const projectDir = new URL(`${config.src}/../`, siteDir);
// const srcPath = path.relative(siteDir.pathname, config.src);
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
        // stat: fs.statSync(path.join(globOpts.cwd, f)),
        stat: fs.statSync(new URL(f, projectDir)),
        contents: fs.createReadStream(path.join(globOpts.cwd, f)),
        // contents: fs.createReadStream(new URL( f, projectDir)),
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
        // var stop = new Date().getTime();

        inBytes += chunk.length;
        spinner.start(
          `Found ${fileCount} files`,
          chalk.gray(`(Uncompressed: ${filesize(inBytes)})`),
          chalk.yellow("\n  " + file.path)
        );
      });

      file.contents.on("end", () => (fileCount += 1));

      // Adding a data handler changes a stream's mode from paused to flowing
      // so we need to change it back or the streams will be truncated
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

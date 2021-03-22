const fs = require("fs-extra");
const path = require("path").posix;

const chalk = require("chalk");
const ora = require("ora");
const filesize = require("filesize");
const replaceStream = require("replacestream");
const isTextPath = require("is-text-path");
const prettyHrtime = require("pretty-hrtime");
const globby = require("globby");
const archiver = require("archiver");
const readPkgUp = require("read-pkg-up");

const { cosmiconfigSync } = require("cosmiconfig");

const siteDir = path.resolve(__dirname, "../site");
const explorerSync = cosmiconfigSync("ideasonpurpose");
const configFile = explorerSync.search(siteDir) || { config: {} };

const buildConfig = require("./lib/buildConfig.js");

const config = buildConfig(configFile);

const { packageJson } = readPkgUp.sync({ cwd: siteDir }) || {
  packageJson: {},
};
const archiveName = process.env.NAME || packageJson.name || "archive";

const archive = archiver("zip", { zlib: { level: 9 } });

const versionDirName = packageJson.version
  ? `${archiveName}-${packageJson.version}`.replace(/[ .]/g, "_")
  : archiveName;

const zipFile = path.resolve(siteDir, `_builds/${versionDirName}.zip`);

let inBytes = 0;
let fileCount = 0;

const prettierHrtime = (hrtime) => {
  let timeString;
  const seconds = hrtime[1] > 5e6 ? " seconds" : " second";
  if (hrtime[0] > 60) {
    timeString = prettyHrtime(hrtime, { verbose: true })
      .replace(/\d+ (milli|micro|nano)seconds/gi, "")
      .trim();
  } else if (hrtime[1] > 5e6) {
    timeString = prettyHrtime(hrtime).replace(/ s$/, seconds);
  } else {
    timeString = prettyHrtime(hrtime);
  }
  return timeString;
};

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
    `${chalk.bold(path.basename(zipFile))} created in ${duration}.` +
      chalk.gray(
        `(${filesize(outBytes)} archive.`,
        `Saved ${filesize(inBytes - outBytes)}`,
        `- ${((outBytes / inBytes) * 100).toFixed(2)}%)`
      )
  );
});

const start = process.hrtime();

archive.pipe(output);

const projectDir = path.resolve(siteDir, config.src, "../");
const globOpts = { cwd: projectDir, nodir: false };
globby(["**/*", "!src", "!builds", "!**/*.sql", "!**/node_modules"], globOpts)
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
        stat: fs.statSync(path.join(globOpts.cwd, f)),
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
        var stop = new Date().getTime();

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

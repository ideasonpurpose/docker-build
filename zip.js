const fs = require("fs-extra");
const path = require("path").posix;

const cosmiconfig = require("cosmiconfig");

const chalk = require("chalk");
const gray = chalk.gray;

const ora = require("ora");
const filesize = require("filesize");

const replaceStream = require("replacestream");

const isTextPath = require("is-text-path");
const prettyHrtime = require("pretty-hrtime");
const globby = require("globby");

const archiver = require("archiver");

const readPkgUp = require("read-pkg-up");

const siteDir = path.resolve(__dirname, "../site");

const explorer = cosmiconfig("ideasonpurpose");
const configFile = explorer.searchSync(siteDir);

const defaultConfig = require("./default.config.js");
const config = { ...defaultConfig, ...configFile.config };

const { pkg } = readPkgUp.sync({ cwd: siteDir });

const pkgName = process.env.NAME || pkg.name;

const archive = archiver("zip", { zlib: { level: 9 } });

const versionDir =
  pkg && pkgName && pkg.version
    ? `${pkgName}-${pkg.version}`.replace(/[ .]/g, "_")
    : "archive";
const zipFile = path.resolve(siteDir, `builds/${versionDir}.zip`); // TODO: remove '-webpack'

let inBytes = 0;
let fileCount = 0;

// TODO: Handle rewrites for the icon manifests, see NJHI console warnings

const prettierHrtime = hrtime => {
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
    `${chalk.bold(path.basename(zipFile))} created in ${duration}.`,
    chalk.gray(
      `(${filesize(outBytes)} archive.`,
      `Saved ${filesize(inBytes - outBytes)}`,
      `- ${((outBytes / inBytes) * 100).toFixed(2)}%)`
    )
  );
});

archive.pipe(output);

// TODO: WordPress specific, up one from config.src
const globOpts = {
  cwd: path.resolve(siteDir, `wp-content/themes/${pkgName}`),
  nodir: false
};

const start = process.hrtime();

globby(["**/*", "!src", "!**/*.sql"], globOpts)
  .then(fileList =>
    fileList.map(f => {
      const file = {
        path: f,
        stat: fs.statSync(path.join(globOpts.cwd, f)),
        contents: fs.createReadStream(path.join(globOpts.cwd, f))
      };

      /**
       * Replace the dev folder name with the versioned folder name in hard-coded
       * include paths. This might only apply to composer's generated autoload
       * files, but it's very fast so might as well check everything.
       *
       * TODO: WordPress specific
       */
      if (isTextPath(f)) {
        const devPath = new RegExp(`wp-content/themes/${pkgName}/`, "gi");

        file.contents = file.contents.pipe(
          replaceStream(devPath, `wp-content/themes/${versionDir}/`)
        );
      }

      file.contents.on("data", chunk => {
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
  .then(fileList =>
    fileList.map(f =>
      archive.append(f.contents, {
        name: f.path,
        prefix: versionDir
      })
    )
  )
  .then(() => archive.finalize())
  .catch(console.error);

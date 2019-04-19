const fs = require("fs-extra");
const path = require("path");

const chalk = require("chalk");
const ora = require("ora");
const filesize = require("filesize");

const replaceStream = require("replacestream");

const isTextPath = require("is-text-path");
const prettyHrtime = require("pretty-hrtime");
const glob = require("glob");
const archiver = require("archiver");

 // TODO: These can go away now that we're in Docker
 //       We still need pkgName, but it should pull from process.env
 const readPkgUp = require("read-pkg-up");
 process.chdir('/usr/src/site');  // TODO: clunky. can this be more portable and less hard-coded:?
 const { pkg } = readPkgUp.sync();
 const pkgName = process.env.NAME || process.env.npm_package_name || pkg.name;

const archive = archiver("zip");

const versionDir =
  pkg && pkgName && pkg.version
    ? `${pkgName}-${pkg.version}`.replace(/[ .]/g, "_")
    : "archive";
const zipFile = `builds/${versionDir}.zip`;

let inBytes = 0;

fs.ensureFileSync(zipFile);
const output = fs.createWriteStream(zipFile);

const globPromise = (pattern, opts) => {
  return new Promise((resolve, reject) => {
    glob(pattern, opts, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });
};

output.on("finish", () => {
  const outBytes = archive.pointer();
  const duration = prettyHrtime(process.hrtime(start));
  const result =
    `Created ${chalk.bold(path.basename(zipFile))} in ${duration}.` +
    chalk.gray(
      `(${filesize(outBytes)} archive.`,
      `Saved ${filesize(inBytes - outBytes)}`,
      `- ${(outBytes / inBytes).toFixed(2)}%)`
    );
  spinner.stopAndPersist({ text: result });
});

archive.pipe(output);

const spinner = ora("Adding files to archive").stopAndPersist();
const start = process.hrtime();
const globOpts = { cwd: `./wp-content/themes/${pkgName}`, nodir: true };

globPromise("**/*", globOpts)
  .then(fileList =>
    fileList.map(f => {
      const file = {
        path: f,
        stat: fs.statSync(path.join(globOpts.cwd, f)),
        contents: fs.createReadStream(path.join(globOpts.cwd, f))
      };

      if (isTextPath(f)) {
        file.contents = file.contents.pipe(replaceStream(/ello/gi, "owdy!!"));
      }

      file.contents.on("data", chunk => {
        spinner.text = file.path;
        inBytes += chunk.length;
      });

      file.contents.on("end", () => {
        // TODO: The ora module's indent settings aren't working, set this later:
        // spinner.indent = 4;
        spinner.succeed(
          file.path + chalk.gray(` (${filesize(file.stat.size)})`)
        );
      });

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

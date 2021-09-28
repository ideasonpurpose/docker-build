const chalk = require("chalk");

/**
 * Simple plugin for restoring the starting compile message which vanished in
 * DevServer v4
 *
 * Messages should be configured in an argument object:
 *
 *    new AfterDoneReporterPlugin({message: "Your Message Here"})
 */
class WatchRunReporterPlugin {
  constructor(options = {}) {
    const defaults = {
      echo: true,
      prefix: `🟢${chalk.gray("(iop)")}:`,
      message: chalk.bold("Compiling..."),
    };
    this.config = { ...defaults, ...options };
    this.name = "IOP Reporter Plugin";
  }

  apply(compiler) {
    compiler.hooks.watchRun.tapPromise(this.name, async () => {
      if (this.config.echo) {
        /**
         * compiler.modifiedFiles is a Set containing the changed file or files
         * along ith the base path containing those files (or the entryPoint?)
         *
         * Sorting the set (as an Array) puts the base path first (it's the shortest)
         * then we remove it from the paths to clean up.
         *
         * Report a single changed path or the count of changed paths
         */
        let msg = "";
        if (compiler.modifiedFiles) {
          let modFiles = Array.from(compiler.modifiedFiles).sort();
          const basePath = modFiles.shift();

          if (modFiles.length > 1) {
            msg = `Modified ${modFiles.length} files `;
          } else {
            msg = "Modified ";
            msg += chalk.bold.yellow(modFiles[0].replace(basePath + "/", ""));
            msg += " ";
          }
        }
        console.log(this.config.prefix, msg + this.config.message);
      }
    });
  }
}

module.exports = WatchRunReporterPlugin;

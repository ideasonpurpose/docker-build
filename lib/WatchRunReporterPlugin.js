import chalk from "chalk";
/**
 * Simple plugin for restoring the starting compile message which vanished in
 * DevServer v4
 *
 * Messages should be configured in an argument object:
 *
 *    new WatchRunReporterPlugin({message: "Your Message Here"})
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
          const basePath = modFiles[0];
          const basePathPattern = new RegExp(`${basePath}/?`, "gi");
          modFiles = modFiles
            .map((p) => p.replace(basePathPattern, ""))
            .filter((p) => p);

          if (modFiles.length > 1) {
            msg = `Modified ${modFiles.length - 1} files `;
          } else {
            msg = `Modified ${chalk.bold.yellow(modFiles[0] || basePath)} `;
          }
        }
        console.log(this.config.prefix, msg + this.config.message);
      }
    });
  }
}

export default WatchRunReporterPlugin;

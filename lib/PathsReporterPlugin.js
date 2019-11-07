/**
 * TODO: Totally not working yet, but the goal here is to dump something to the console after
 *       Webpack has reported stats. Since the stats blob can be long, it would be useful to
 *       inject relevant preview urls into the console.
 *
 * TODO: Mybe hook the logger itself (sync) with something like `hooks.infrastructureLog`?
 */
const chalk = require("chalk");

class PathsReporterPlugin {
  constructor(options) {
    const defaults = {
      writeManifestFile: false,
      manifestFileName: "dependency-manifest.json"
    };
    this.config = { ...defaults, ...options };
    this.name = "Dependency Manifest Plugin";
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise(this.name, async () => {
      console.log(chalk.magenta.bold("reporting for duty!"));
    });

    // TODO: Still comes in before stats
    compiler.hooks.done.tapPromise(this.name, async () => {
      console.log(chalk.cyan.bold("Done?"));
    });
  }
}

module.exports = PathsReporterPlugin;

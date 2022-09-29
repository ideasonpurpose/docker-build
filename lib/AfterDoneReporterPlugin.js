import chalk from "chalk";

/**
 * Simple plugin for printing some text after compilation stats are displayed
 *
 * Messages should be configured in an argument object:
 *
 *    new AfterDoneReporterPlugin({message: "Your Message Here"})
 */
export default class AfterDoneReporterPlugin {
  constructor(options = {}) {
    const defaults = {
      echo: true,
      prefix: `🟢${chalk.gray("(iop)")}:`,
      message: "AfterDoneReporter Plugin Status Message",
    };
    this.config = { ...defaults, ...options };
    this.name = "IOP Reporter Plugin";
  }

  apply(compiler) {
    compiler.hooks.done.tapPromise(this.name, async (stats) => {
      if (this.config.echo) {
        // const logger = stats.compilation.getLogger(this.name);
        // logger.info("hello from the real logger");
        setTimeout(() => console.log(this.config.prefix, this.config.message));
      }
    });
  }
}

const promisify = require("util").promisify;
const dns = require("dns");

const chalk = require("chalk");

const lookup = promisify(dns.lookup);

const { cosmiconfigSync } = require("cosmiconfig");
const browsersync = require("browser-sync").create();

const explorerSync = cosmiconfigSync("ideasonpurpose");
const configFile = explorerSync.search("../site");

const getIP = async addr => (await lookup(addr)).address;

console.log(
  chalk.bold("Previewing Production Build with Browsersync"),
  chalk.gray(" (Control-C to cancel)")
);

(async () =>
  browsersync.init({
    proxy: config.proxy,
    open: false,
    host: await getIP("host.docker.internal")
  }))();

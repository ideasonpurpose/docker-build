// const { dns } = require("dns").promises;

// DO NOT destructure this or we won't be able to mock it
// import {promises as dnsPromises} from "dns";
import dns from "dns";
import chalk from "chalk";
import { isIP } from "net";

/**
 * If config.proxy is explicitly not false, return a {proxy} object
 * otherwise return an empty object.
 */
export default async (config) => {
  let target;

  console.log({config});

  // if (
  //   config.proxy ===
  //   "http://devserver-proxy-token--d939bef2a41c4aa154ddb8db903ce19fff338b61"
  // ) {
  //   /**
  //    * Deal with the legacy service hostname, re-map to 'wordpress' which will
  //    * be resolved to an IP address.
  //    *
  //    *  TODO: Remove this warning after 2023-02 (extended another year, not hurting anything)
  //    */

  //   console.log(
  //     "⚠️ ",
  //     `The ${chalk.magenta(
  //       "devserver-proxy-token"
  //     )} value is no longer necessary`,
  //     "and can be safely removed from docker-compose"
  //   );

  //   /**
  //    * 'wordpress' is the internal hostname used by docker
  //    */
  //   target = await dns.promises.resolve("wordpress").catch(() => false);
  //   if (target) {
  //     target = "http://" + target.pop();
  //   }
  // } else if (!!isIP(config.proxy)) {
  if (!!isIP(config.proxy)) {
    /**
     * Bare IP addresses
     * net.isIP() returns 4, 6 or 0(IPv4, IPv6 or not-an-IP address)
     */
    target = `http://${config.proxy}`;
  } else if (
    typeof config.proxy == "string" &&
    !config.proxy.match(/^https?:\/\//i)
  ) {
    /**
     * Handle plain strings that don't start with http:// or https://
     * Attempt to resolve these to IP addresses
     */
    target = await dns.promises.resolve(config.proxy).catch(() => false);

    if (target) {
      target = "http://" + target.pop();
    }
  } else {
    /**
     * Pass anything else straight through
     */
    target = config.proxy;
  }

  /**
   * Note: This is a sticky bit of code. Everything above gets bottlenecked here, and
   * if aa previous value of target can't be converted to a URL, the whole proxy will
   * return an empty object.
   */
  try {
    config.proxyUrl = new URL(target);
  } catch (err) {
    // Invalid URL, unable to configure proxy.
    return {};
  }

  // console.log({ target , proxyUrl: config.proxyUrl});

  const proxy = {
    "**": {
      target,
      secure: false,
      autoRewrite: true,
      selfHandleResponse: true, // necessary to avoid res.end being called automatically
      changeOrigin: true, // needed for virtual hosted sites
      cookieDomainRewrite: "", // was `${config.host}:8080` ??
      headers: { "Accept-Encoding": "identity" },

      onError: (err, req, res) => {
        if (err.code === "ECONNRESET") {
          console.log(chalk.yellow("Caught ECONNRESET error, ignoring..."));
        } else {
          console.log("PROXY ERROR: ", req.url, err, err.stack);
          res.writeHead(500, { "Content-Type": "text-plain" });
          res.end("Webpack DevServer Proxy Error: " + err);
        }
      },

      onProxyRes: function (proxyRes, req, res) {
        /**
         * Update urls in files with these content-types
         */
        const contentTypes = [
          "application/javascript",
          "application/json",
          "multipart/form-data",
          "text/css",
          "text/html",
          "text/plain",
        ];

        let originalBody = [];

        proxyRes.on("data", (data) => originalBody.push(data));

        proxyRes.on("end", () => {
          res.statusCode = proxyRes.statusCode;
          if (proxyRes.statusMessage) {
            res.statusMessage = proxyRes.statusMessage;
          }

          Object.keys(proxyRes.headers).forEach((key) => {
            let header = proxyRes.headers[key];
            if (typeof header == "string") {
              header = header.replace(
                new RegExp(config.proxyUrl.host, "gi"),
                req.headers.host
              );
            }
            res.setHeader(String(key).trim(), header);
          });

          originalBody = Buffer.concat(originalBody);
          let newBody;
          const type = (proxyRes.headers["content-type"] || "").split(";")[0];
          const wpRegexp = new RegExp(
            "^/wp-(?:admin|includes|content/plugins).*(?:css|js|map)$"
          );
          const originRegExp = new RegExp(
            `(http:\\\\/\\\\/|http://)${config.proxyUrl.host}`,
            "gi"
          );

          if (contentTypes.includes(type) && !wpRegexp.test(req.path)) {
            newBody = originalBody
              .toString("utf8")
              .replace(originRegExp, `$1${req.headers.host}`);
            res.setHeader("Content-Length", Buffer.byteLength(newBody));
          } else {
            newBody = originalBody;
          }

          res.end(newBody);
        });
      },
    },
  };

  return { proxy };
};

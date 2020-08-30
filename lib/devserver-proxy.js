const chalk = require("chalk");

module.exports = (config) => {
  return {
    "**": {
      target: config.proxyUrl.origin,
      secure: false,
      autoRewrite: true,
      selfHandleResponse: true, // necessary to avoid res.end being called automatically
      changeOrigin: true, // needed for virtual hosted sites
      cookieDomainRewrite: "", // was `${config.host}:8080` ??
      headers: { "Accept-Encoding": "identity" },
      // logLevel: "debug",

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
        // console.log('config.proxyUrl.origin', config.proxyUrl.origin);
        // TODO: WHY OH WHY is this replacing the hostname and not the protocol too?
        //      Seems like a disaster waiting to happen.
        //      Maybe this should be several replacements? They're fast enough
        // TODO: Log the fuck out of this.
        const replaceTarget = (str) =>
          str.replace(new RegExp(config.proxyUrl.host, "gi"), req.headers.host);

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

        const wpRegexp = new RegExp(
          "^/wp-(?:admin|includes|content/plugins).*(?:css|js|map)$"
        );

        let originalBody = []; //Buffer.from([]);

        proxyRes.on("data", (data) => originalBody.push(data));

        proxyRes.on("end", () => {
          const start = process.hrtime();
          res.statusCode = proxyRes.statusCode;
          if (proxyRes.statusMessage) {
            res.statusMessage = proxyRes.statusMessage;
          }

          Object.keys(proxyRes.headers).forEach((key) => {
            const header = proxyRes.headers[key];
            if (header !== undefined) {
              res.setHeader(
                String(key).trim(),
                typeof header == "string" ? replaceTarget(header) : header
              );
            }
          });

          const type = (proxyRes.headers["content-type"] || "").split(";")[0];

          originalBody = Buffer.concat(originalBody);
          let newBody;

          if (contentTypes.includes(type) && !wpRegexp.test(req.path)) {
            newBody = replaceTarget(originalBody.toString("utf8"));
            res.setHeader("Content-Length", Buffer.byteLength(newBody));
            const end = process.hrtime(start);
          } else {
            // console.log(`Skipping ${chalk.gray(req.path)}`);
            newBody = originalBody;
          }

          res.end(newBody);
        });
      },
    },
  };
};

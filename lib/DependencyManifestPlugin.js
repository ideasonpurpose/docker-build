const fs = require("fs-extra");
const path = require("path");

class DependencyManifestPlugin {
  constructor(options) {
    const defaults = {
      writeManifestFile: false,
      manifestFile: "./dependency-manifest.json",
    };
    this.config = { ...defaults, ...options };
    this.name = "Dependency Manifest Plugin";
    this.manifest = {};
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync(this.name, (compilation, callback) => {
      Array.from(compilation.namedChunkGroups.entries()).forEach(
        ([key, group]) => {
          this.manifest[key] = group.chunks.reduce(
            (entry, chunk) => {
              chunk.files
                /**
                 * hot-update files will stomp on the main file, filter them out
                 */
                .filter((file) => !file.includes("hot-update"))
                .forEach((file) => {
                  const ext = path.extname(file);
                  const silo = chunk.entryModule ? "files" : "dependencies";
                  const filepath = path.resolve(
                    compiler.options.output.publicPath,
                    file
                  );
                  entry[silo][chunk.id + ext] = filepath;
                });
              return entry;
            },
            { files: {}, dependencies: {} }
          );
        }
      );

      callback();
    });

    compiler.hooks.afterEmit.tapPromise(this.name, async () => {
      if (this.config.writeManifestFile) {
        return await fs.outputJSON(
          path.resolve(compiler.options.output.path, this.config.manifestFile),
          this.manifest,
          { spaces: 2 }
        );
      }
    });
  }
}

module.exports = DependencyManifestPlugin;

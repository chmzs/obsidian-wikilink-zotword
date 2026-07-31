import esbuild from "esbuild";
import { copyFileSync, mkdirSync, cpSync, rmSync, existsSync } from "fs";
import { execSync } from "child_process";
import * as path from "path";

const prod = process.argv[2] === "production";

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "node",
    external: [
      "obsidian",
      "electron",
      "@codemirror/autocomplete",
      "@codemirror/collab",
      "@codemirror/commands",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/view",
      "@lezer/common",
      "@lezer/highlight",
      "@lezer/lr",
    ],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: "main.js",
    minify: prod,
  })
  .then(() => {
    if (prod) {
      // Copy plugin files to dist/ (flat, for Obsidian community registry)
      mkdirSync("dist/filters", { recursive: true });
      copyFileSync("main.js", "dist/main.js");
      copyFileSync("manifest.json", "dist/manifest.json");
      copyFileSync("styles.css", "dist/styles.css");
      copyFileSync("versions.json", "dist/versions.json");
      cpSync("filters", "dist/filters", { recursive: true });
      console.log("Plugin files copied to dist/");

      // Package as zip with plugin-folder structure for manual install:
      //   wikilink-zotword.zip
      //   └── wikilink-zotword/
      //       ├── main.js
      //       ├── manifest.json
      //       ├── styles.css
      //       ├── versions.json
      //       └── filters/
      const zipDir = path.join("dist", "wikilink-zotword");
      if (existsSync(zipDir)) rmSync(zipDir, { recursive: true });
      mkdirSync(path.join(zipDir, "filters"), { recursive: true });
      copyFileSync("main.js", path.join(zipDir, "main.js"));
      copyFileSync("manifest.json", path.join(zipDir, "manifest.json"));
      copyFileSync("styles.css", path.join(zipDir, "styles.css"));
      copyFileSync("versions.json", path.join(zipDir, "versions.json"));
      cpSync("filters", path.join(zipDir, "filters"), { recursive: true });

      const zipName = `wikilink-zotword.zip`;
      const zipPath = path.join("dist", zipName);
      // Use PowerShell Compress-Archive (available on Windows 10+; GitHub Actions windows runners)
      // -Path points at the folder itself so the zip contains wikilink-zotword/... entries
      const cmd = `powershell -NoProfile -Command "Compress-Archive -Path '${zipDir.replace(/\\/g, '/')}' -DestinationPath '${zipPath.replace(/\\/g, '/')}' -Force"`;
      execSync(cmd, { stdio: "inherit" });

      rmSync(zipDir, { recursive: true });
      console.log(`Packaged ${zipName}`);
    }
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

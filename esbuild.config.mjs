import esbuild from "esbuild";
import { copyFileSync, mkdirSync, cpSync } from "fs";

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
    // Copy plugin files to dist/ for easy installation
    if (prod) {
      mkdirSync("dist", { recursive: true });
      mkdirSync("dist/filters", { recursive: true });
      copyFileSync("main.js", "dist/main.js");
      copyFileSync("manifest.json", "dist/manifest.json");
      copyFileSync("styles.css", "dist/styles.css");
      cpSync("filters", "dist/filters", { recursive: true });
      console.log("Plugin files copied to dist/");
    }
  })
  .catch(() => process.exit(1));

import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";
import { sveltePreprocess } from "svelte-preprocess";
import foundryvtt from "vite-plugin-foundryvtt";
import checker from "vite-plugin-checker";
import fs from "node:fs/promises";
import path from "node:path";

import systemJson from "./src/system.json";

const DIST_DIR = "dist";

/** After `vite build`, `dist/` is also copied here unless skipped or overridden (see README). */
const DEFAULT_MIRROR_LANCER_DIR = "F:/FoundryVTT/Data/systems/lancer";

function getExplicitMirrorDir(): string | null {
  const raw = process.env.FOUNDRY_SYSTEM_DIR ?? process.env.VITE_FOUNDRY_SYSTEM_DIR;
  const d = raw?.trim();
  return d ? path.resolve(d) : null;
}

async function getFvttDataMirrorDir(): Promise<string | null> {
  const flag = process.env.MIRROR_DIST_TO_FOUNDRY_DATA ?? process.env.VITE_MIRROR_DIST_TO_FOUNDRY_DATA;
  if (flag !== "1") return null;
  try {
    const { execSync } = await import("node:child_process");
    const dataPath = execSync("npx fvtt --config ./fvttrc.yml configure get dataPath", { encoding: "utf8" }).trim();
    if (!dataPath || dataPath === "undefined") return null;
    return path.join(dataPath, "Data", "systems", "lancer");
  } catch {
    return null;
  }
}

async function getMirrorTargetDir(): Promise<string | null> {
  if (process.env.SKIP_FOUNDRY_DIST_MIRROR === "1" || process.env.VITE_SKIP_FOUNDRY_DIST_MIRROR === "1") {
    return null;
  }
  return getExplicitMirrorDir() ?? (await getFvttDataMirrorDir()) ?? path.resolve(DEFAULT_MIRROR_LANCER_DIR);
}

/** Remove prior JS chunks at the system root so old bundles cannot coexist with the new lancer.mjs. */
async function removeRootMjsArtifacts(systemDir: string) {
  let names: string[];
  try {
    names = await fs.readdir(systemDir);
  } catch {
    return;
  }
  await Promise.all(
    names.map(async name => {
      if (!name.endsWith(".mjs") && !name.endsWith(".mjs.map")) return;
      const p = path.join(systemDir, name);
      const st = await fs.stat(p).catch(() => null);
      if (st?.isFile()) await fs.unlink(p);
    })
  );
}

/** Copy build output; packs may be locked while Foundry is running (LevelDB). */
async function mirrorDistToFoundrySystem(sourceDir: string, targetDir: string) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(sourceDir, e.name);
    const dest = path.join(targetDir, e.name);
    if (e.isDirectory() && e.name === "packs") {
      try {
        await fs.cp(src, dest, { recursive: true, force: true });
      } catch (err) {
        const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "EBUSY" || code === "EPERM") {
          console.warn(
            "[mirror-build-to-foundry-system] Skipped packs/ (files in use). Close Foundry VTT and run `npm run build` again to update compendium packs."
          );
        } else {
          throw err;
        }
      }
      continue;
    }
    await fs.cp(src, dest, { recursive: true, force: true });
  }
}

async function copyBundledAutorecToDist() {
  const source = path.resolve("resources/autoanimations/lancer-autorec-menu.json");
  const dest = path.resolve(DIST_DIR, "lancer-autorec-menu.json");
  try {
    await fs.copyFile(source, dest);
  } catch (err) {
    console.warn("[mirror-build-to-foundry-system] Could not copy lancer-autorec-menu.json into dist root.", err);
  }
}

export default defineConfig({
  base: "/systems/lancer/",
  server: {
    port: 30001,
    open: "/",
    proxy: {
      "^(?!/systems/lancer)": "http://localhost:30000/",
      "/socket.io": {
        target: "ws://localhost:30000",
        ws: true,
      },
    },
  },
  // For AWS Config
  resolve: { alias: [{ find: "./runtimeConfig", replacement: "./runtimeConfig.browser" }] },
  optimizeDeps: {
    include: ["@massif/lancer-data"],
  },
  build: {
    outDir: DIST_DIR,
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      name: "lancer",
      entry: "src/lancer.ts",
      formats: ["es"],
      fileName: "lancer",
    },
  },
  esbuild: {
    minifyIdentifiers: false,
    keepNames: true,
  },
  plugins: [
    checker({ typescript: true, enableBuild: false }),
    svelte({
      preprocess: sveltePreprocess(),
      onwarn(warning, defaultHandler) {
        // HUD / LCP Svelte surfaces: silence repetitive compiler noise (icons, internal hover chrome).
        const ignored = new Set([
          "a11y_consider_explicit_label",
          "a11y_no_static_element_interactions",
          "css_unused_selector",
          "element_invalid_self_closing_tag",
          "export_let_unused",
        ]);
        if (warning.code && ignored.has(warning.code)) return;
        defaultHandler(warning);
      },
    }),
    foundryvtt(systemJson),
    {
      name: "aws-global-fix",
      apply: "serve",
      transform(code, id) {
        // Define window.global for use by an aws dependency
        if (id === "\0virtual:entrypoint") return "window.global = window;\n" + code;
      },
    },
    {
      name: "mirror-build-to-foundry-system",
      apply: "build",
      async closeBundle() {
        await copyBundledAutorecToDist();
        const sourceDir = path.resolve(DIST_DIR);
        const targetDir = await getMirrorTargetDir();
        if (!targetDir) return;
        await fs.mkdir(targetDir, { recursive: true });
        await removeRootMjsArtifacts(targetDir);
        await mirrorDistToFoundrySystem(sourceDir, targetDir);
      },
    },
    visualizer({ gzipSize: true, template: "treemap" }),
  ],
  define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV) }, // This is to make tippy not error out in production
});

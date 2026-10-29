import { createHash } from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const indexPath = resolve(root, "index.html");
const original = await readFile(indexPath, "utf8");
const mapBlock = /<!-- asset-map:start -->[\s\S]*?<!-- asset-map:end -->/;
if (!mapBlock.test(original))
  throw new Error("Falta el bloque de versiones de recursos en index.html");
const canonical = original
  .replace(mapBlock, "<!-- asset-map:start --><!-- asset-map:end -->")
  .replace(/(style\.css|src\/main\.js)\?v=[a-f0-9]+/g, "$1")
  .replace(/data-build="[a-f0-9]+"/, 'data-build="BUILD"');
const files = (await readdir(resolve(root, "src")))
  .filter((name) => name.endsWith(".js"))
  .sort()
  .map((name) => `src/${name}`);
files.push("vendor/three.module.js");
const hash = createHash("sha256").update(canonical);
for (const file of [...files, "style.css"])
  hash.update(file).update(await readFile(resolve(root, file)));
const version = hash.digest("hex").slice(0, 12);
const imports = Object.fromEntries(
  files.map((file) => [`./${file}`, `./${file}?v=${version}`]),
);
const block = `<!-- asset-map:start -->\n    <script type="importmap">\n${JSON.stringify({ imports }, null, 2)}\n    </script>\n    <!-- asset-map:end -->`;
const updated = original
  .replace(mapBlock, block)
  .replace(
    /href="style\.css(?:\?v=[a-f0-9]+)?"/,
    `href="style.css?v=${version}"`,
  )
  .replace(
    /src="src\/main\.js(?:\?v=[a-f0-9]+)?"/,
    `src="src/main.js?v=${version}"`,
  )
  .replace(/data-build="[^"]*"/, `data-build="${version}"`);
if (process.argv.includes("--check")) {
  if (original !== updated) {
    console.error(
      "Recursos modificados: ejecuta npm run version:assets antes de publicar.",
    );
    process.exitCode = 1;
  } else console.log(`Recursos versionados: ${version}`);
} else {
  await writeFile(indexPath, updated);
  console.log(`Recursos versionados: ${version}`);
}

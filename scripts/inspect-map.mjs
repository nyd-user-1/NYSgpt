// Writes lib/inspect-map.json: where each element the Inspector can name is
// written, as "file:line". The homepage marks those elements with
// data-inspect="Name"; this finds every mark and records its place, so the
// line the Inspector shows is the real one. Run it again after editing a file
// that carries a mark:  node scripts/inspect-map.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const map = {};

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".tsx")) {
      readFileSync(path, "utf8").split("\n").forEach((line, i) => {
        const mark = line.match(/data-inspect="([A-Za-z]+)"/);
        if (mark && !(mark[1] in map)) map[mark[1]] = `${relative(root, path)}:${i + 1}`;
      });
    }
  }
}

for (const dir of ["app", "components"]) walk(join(root, dir));
writeFileSync(join(root, "lib/inspect-map.json"), JSON.stringify(map, null, 2) + "\n");
console.log(Object.keys(map).length, "elements");

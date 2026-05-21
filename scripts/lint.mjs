import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    if (entry.isFile()) out.push(path);
  }
  return out;
}

const files = (await Promise.all(["src", "web", "tests", "scripts"].map((dir) => walk(dir).catch(() => [])))).flat();
const errors = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (line.length > 180) errors.push(`${file}:${index + 1} line exceeds 180 characters`);
    if (/\s+$/.test(line)) errors.push(`${file}:${index + 1} trailing whitespace`);
  });
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`lint passed for ${files.length} files`);

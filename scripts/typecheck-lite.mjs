import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(path));
    if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) out.push(path);
  }
  return out;
}

const sourceFiles = [...await files("src"), ...await files("tests"), ...await files("scripts").catch(() => [])];
const errors = [];
for (const file of sourceFiles) {
  const text = await readFile(file, "utf8");
  if (text.includes("\t")) errors.push(`${file}: tabs are not allowed`);
  if (/:\s*any\b/.test(text)) errors.push(`${file}: avoid explicit any`);
  if (/TODO|implementation left to user|placeholder/i.test(text)) errors.push(`${file}: unfinished marker found`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`typecheck-lite passed for ${sourceFiles.length} files`);

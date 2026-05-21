const files = process.argv.slice(2);
for (const file of files) {
  await import(new URL(`../${file}`, import.meta.url));
}

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const forbidden = ["MacPet", "macpet"];
const ignoredDirs = new Set(["node_modules", "dist", ".git"]);
const ignoredFiles = new Set(["package-lock.json", "check-brand.js"]);
const checkedExtensions = new Set([".js", ".json", ".html", ".css", ".md", ".yml", ".yaml", ".svg", ".txt"]);

function walk(dir) {
  const hits = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...walk(fullPath));
      continue;
    }

    if (ignoredFiles.has(entry.name) || !checkedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const text = fs.readFileSync(fullPath, "utf8");
    for (const needle of forbidden) {
      if (text.includes(needle)) {
        hits.push(`${path.relative(root, fullPath)} contains ${needle}`);
      }
    }
  }

  return hits;
}

const hits = walk(root);

if (hits.length > 0) {
  console.error("Brand check failed:");
  for (const hit of hits) {
    console.error(`- ${hit}`);
  }
  process.exit(1);
}

console.log("Brand check passed.");

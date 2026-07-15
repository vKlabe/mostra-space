import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_LOCALE = "it";
const SCAN_DIRS = ["app", "components"];
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkDirectory(dirPath) {
  const results = [];

  if (!(await pathExists(dirPath))) {
    return results;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        results.push(...(await walkDirectory(fullPath)));
      }

      continue;
    }

    if (
      entry.isFile() &&
      /\.(tsx|ts|jsx|js)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function decodeJsString(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function extractTEntriesFromContent(content, filePath) {
  const entries = [];
  const tagRegex = /<T\b[\s\S]*?\/>/g;
  const tags = content.match(tagRegex) || [];

  for (const tag of tags) {
    const textKeyMatch =
      tag.match(/textKey\s*=\s*["']([^"']+)["']/) ||
      tag.match(/textKey\s*=\s*{\s*["']([^"']+)["']\s*}/);

    const fallbackMatch =
      tag.match(/fallback\s*=\s*["']([\s\S]*?)["']/) ||
      tag.match(/fallback\s*=\s*{\s*["']([\s\S]*?)["']\s*}/);

    if (!textKeyMatch) {
      continue;
    }

    entries.push({
      textKey: textKeyMatch[1].trim(),
      fallback: fallbackMatch ? decodeJsString(fallbackMatch[1]) : "",
      filePath: path.relative(ROOT, filePath),
    });
  }

  return entries;
}

function cleanJsxText(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/{" "}/g, "")
    .trim();
}

function looksLikeUserText(value) {
  const text = cleanJsxText(value);

  if (!text) {
    return false;
  }

  if (text.length < 3) {
    return false;
  }

  if (!/[A-Za-zÀ-ÿ]/.test(text)) {
    return false;
  }

  if (/^[A-Z0-9_./:-]+$/.test(text)) {
    return false;
  }

  if (
    text.includes("var(--") ||
    text.includes("rgba(") ||
    text.includes("linear-gradient") ||
    text.includes("http") ||
    text.includes("@/")
  ) {
    return false;
  }

  return true;
}

function findPossibleHardcodedJsxText(content, filePath) {
  const warnings = [];
  const regex = />\s*([^<>{}][^<>{}]*)\s*</g;

  let match;

  while ((match = regex.exec(content)) !== null) {
    const text = cleanJsxText(match[1]);

    if (!looksLikeUserText(text)) {
      continue;
    }

    const before = content.slice(Math.max(0, match.index - 120), match.index);

    if (before.includes("<T") || before.includes("fallback=")) {
      continue;
    }

    warnings.push({
      text,
      filePath: path.relative(ROOT, filePath),
    });
  }

  return warnings;
}

async function readJson(filePath) {
  if (!(await pathExists(filePath))) {
    return {};
  }

  const content = await fs.readFile(filePath, "utf8");

  if (!content.trim()) {
    return {};
  }

  return JSON.parse(content);
}

async function main() {
  const files = [];

  for (const dir of SCAN_DIRS) {
    files.push(...(await walkDirectory(path.join(ROOT, dir))));
  }

  const byKey = new Map();
  const duplicateWarnings = [];
  const hardcodedWarnings = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    const entries = extractTEntriesFromContent(content, filePath);

    for (const entry of entries) {
      const existing = byKey.get(entry.textKey);

      if (existing && existing.fallback !== entry.fallback) {
        duplicateWarnings.push({
          key: entry.textKey,
          first: existing,
          second: entry,
        });
      }

      if (!existing) {
        byKey.set(entry.textKey, entry);
      }
    }

    hardcodedWarnings.push(...findPossibleHardcodedJsxText(content, filePath));
  }

  const entries = [...byKey.values()].sort((a, b) =>
    a.textKey.localeCompare(b.textKey)
  );

  const messagesDir = path.join(ROOT, "messages");

  if (!(await pathExists(messagesDir))) {
    console.error("Cartella messages non trovata.");
    process.exit(1);
  }

  const messageFiles = (await fs.readdir(messagesDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const usedKeys = new Set(entries.map((entry) => entry.textKey));
  let hasError = false;

  console.log(`\nControllo ${entries.length} chiavi <T />.`);

  for (const fileName of messageFiles) {
    const locale = fileName.replace(/\.json$/, "");
    const filePath = path.join(messagesDir, fileName);
    const messages = await readJson(filePath);

    const missing = [...usedKeys].filter((key) => !(key in messages));

    if (missing.length > 0) {
      hasError = true;
      console.error(`\n${fileName}: ${missing.length} chiavi mancanti`);

      for (const key of missing.slice(0, 50)) {
        console.error(`- ${key}`);
      }

      if (missing.length > 50) {
        console.error(`...altre ${missing.length - 50} chiavi`);
      }
    }

    const orphan = Object.keys(messages).filter((key) => !usedKeys.has(key));

    if (orphan.length > 0) {
      console.log(`\n${fileName}: ${orphan.length} chiavi non usate nel codice`);
    }

    if (locale === SOURCE_LOCALE) {
      const empty = Object.entries(messages).filter(
        ([, value]) => typeof value !== "string" || !value.trim()
      );

      if (empty.length > 0) {
        hasError = true;
        console.error(`\n${fileName}: ${empty.length} valori vuoti`);
      }
    }
  }

  if (duplicateWarnings.length > 0) {
    hasError = true;
    console.error("\nChiavi duplicate con fallback diversi:");

    for (const warning of duplicateWarnings) {
      console.error(`- ${warning.key}`);
      console.error(`  ${warning.first.filePath}: ${warning.first.fallback}`);
      console.error(`  ${warning.second.filePath}: ${warning.second.fallback}`);
    }
  }

  if (hardcodedWarnings.length > 0) {
    console.log("\nPossibili testi hardcoded da convertire in <T />:");

    for (const warning of hardcodedWarnings.slice(0, 80)) {
      console.log(`- ${warning.filePath}: "${warning.text}"`);
    }

    if (hardcodedWarnings.length > 80) {
      console.log(`...altri ${hardcodedWarnings.length - 80} possibili testi.`);
    }
  }

  if (hasError) {
    console.error("\ni18n check fallito.\n");
    process.exit(1);
  }

  console.log("\ni18n check completato.\n");
}

main().catch((error) => {
  console.error("\nErrore i18n:check");
  console.error(error);
  process.exit(1);
});
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_LOCALE = "it";
const DEFAULT_LOCALES = ["it", "en", "fr", "es", "de"];

const SCAN_DIRS = ["app", "components"];
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

const LANGUAGE_NAMES = {
  it: "Italian",
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
};

function parseArgs() {
  const args = process.argv.slice(2);

  return {
    noAi: args.includes("--no-ai"),
    dryRun: args.includes("--dry-run"),
  };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadEnvFile(fileName) {
  const filePath = path.join(ROOT, fileName);

  if (!(await pathExists(filePath))) {
    return;
  }

  const content = await fs.readFile(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function loadEnv() {
  await loadEnvFile(".env.local");
  await loadEnvFile(".env");
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

    const textKey = textKeyMatch[1].trim();

    if (!textKey) {
      continue;
    }

    const fallback = fallbackMatch ? decodeJsString(fallbackMatch[1]) : "";

    entries.push({
      textKey,
      fallback,
      filePath: path.relative(ROOT, filePath),
    });
  }

  return entries;
}

async function extractEntries() {
  const files = [];

  for (const dir of SCAN_DIRS) {
    files.push(...(await walkDirectory(path.join(ROOT, dir))));
  }

  const byKey = new Map();
  const duplicateWarnings = [];

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
  }

  return {
    entries: [...byKey.values()].sort((a, b) =>
      a.textKey.localeCompare(b.textKey)
    ),
    duplicateWarnings,
  };
}

async function getMessageFiles() {
  const messagesDir = path.join(ROOT, "messages");
  await fs.mkdir(messagesDir, { recursive: true });

  const entries = await fs.readdir(messagesDir, { withFileTypes: true });
  const locales = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.replace(/\.json$/, ""))
    .sort();

  if (locales.length === 0) {
    for (const locale of DEFAULT_LOCALES) {
      await fs.writeFile(
        path.join(messagesDir, `${locale}.json`),
        "{\n}\n",
        "utf8"
      );
    }

    return DEFAULT_LOCALES;
  }

  if (!locales.includes(SOURCE_LOCALE)) {
    locales.unshift(SOURCE_LOCALE);
    await fs.writeFile(
      path.join(messagesDir, `${SOURCE_LOCALE}.json`),
      "{\n}\n",
      "utf8"
    );
  }

  return locales;
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

function sortObjectKeys(object) {
  return Object.fromEntries(
    Object.entries(object).sort(([a], [b]) => a.localeCompare(b))
  );
}

async function writeJson(filePath, object, dryRun) {
  const sorted = sortObjectKeys(object);
  const content = `${JSON.stringify(sorted, null, 2)}\n`;

  if (!dryRun) {
    await fs.writeFile(filePath, content, "utf8");
  }
}

async function translateBatch({ locale, items }) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY mancante.");
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const targetLanguage = LANGUAGE_NAMES[locale] || locale;
  const model = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini";

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a professional translator for a polished art, museum, gallery and SaaS product website. Translate from Italian into the requested target language. Preserve placeholders, brand names, URLs, arrows, punctuation style and JSON keys. Return only valid JSON in the shape {\"translations\":{\"key\":\"translated value\"}}.",
      },
      {
        role: "user",
        content: JSON.stringify({
          targetLanguage,
          locale,
          items,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  if (!parsed.translations || typeof parsed.translations !== "object") {
    throw new Error("Risposta traduzione non valida.");
  }

  return parsed.translations;
}

async function main() {
  const args = parseArgs();

  await loadEnv();

  const messagesDir = path.join(ROOT, "messages");
  const locales = await getMessageFiles();
  const { entries, duplicateWarnings } = await extractEntries();

  console.log(`\nTrovate ${entries.length} chiavi <T /> nel codice.`);

  if (duplicateWarnings.length > 0) {
    console.log("\nAttenzione: stesse chiavi con fallback diversi:");

    for (const warning of duplicateWarnings) {
      console.log(`- ${warning.key}`);
      console.log(`  ${warning.first.filePath}: ${warning.first.fallback}`);
      console.log(`  ${warning.second.filePath}: ${warning.second.fallback}`);
    }
  }

  const sourcePath = path.join(messagesDir, `${SOURCE_LOCALE}.json`);
  const sourceMessages = await readJson(sourcePath);

  let addedToSource = 0;

  for (const entry of entries) {
    if (!(entry.textKey in sourceMessages)) {
      sourceMessages[entry.textKey] = entry.fallback || entry.textKey;
      addedToSource += 1;
    }
  }

  await writeJson(sourcePath, sourceMessages, args.dryRun);

  console.log(
    `\n${SOURCE_LOCALE}.json: ${addedToSource} nuove chiavi aggiunte.`
  );

  for (const locale of locales) {
    if (locale === SOURCE_LOCALE) {
      continue;
    }

    const targetPath = path.join(messagesDir, `${locale}.json`);
    const targetMessages = await readJson(targetPath);

    const missingItems = entries
      .filter((entry) => !(entry.textKey in targetMessages))
      .map((entry) => ({
        key: entry.textKey,
        text: sourceMessages[entry.textKey] || entry.fallback || entry.textKey,
      }));

    if (missingItems.length === 0) {
      console.log(`${locale}.json: nessuna nuova chiave.`);
      await writeJson(targetPath, targetMessages, args.dryRun);
      continue;
    }

    if (args.noAi || !process.env.OPENAI_API_KEY) {
      console.log(
        `${locale}.json: ${missingItems.length} chiavi mancanti. Traduzione AI saltata.`
      );
      await writeJson(targetPath, targetMessages, args.dryRun);
      continue;
    }

    console.log(
      `${locale}.json: traduco ${missingItems.length} nuove chiavi...`
    );

    const translations = await translateBatch({
      locale,
      items: missingItems,
    });

    for (const item of missingItems) {
      const translatedValue = translations[item.key];

      if (typeof translatedValue === "string" && translatedValue.trim()) {
        targetMessages[item.key] = translatedValue.trim();
      }
    }

    await writeJson(targetPath, targetMessages, args.dryRun);

    console.log(`${locale}.json: traduzioni aggiunte.`);
  }

  console.log("\nSync traduzioni completato.\n");
}

main().catch((error) => {
  console.error("\nErrore i18n:sync");
  console.error(error);
  process.exit(1);
});
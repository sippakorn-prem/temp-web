// Fails if the TH and EN catalogs drift apart. A missing key is a blank screen in one
// language and nothing at all in the other, so this runs in `npm run check`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "messages");

function flatten(value, prefix = "") {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key)
  );
}

const catalogs = ["en", "th"].map((locale) => ({
  locale,
  keys: new Set(flatten(JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), "utf8")))),
}));

const [en, th] = catalogs;
const missingInTh = [...en.keys].filter((k) => !th.keys.has(k));
const missingInEn = [...th.keys].filter((k) => !en.keys.has(k));

if (missingInTh.length || missingInEn.length) {
  if (missingInTh.length) console.error(`Missing in th.json:\n  ${missingInTh.join("\n  ")}`);
  if (missingInEn.length) console.error(`Missing in en.json:\n  ${missingInEn.join("\n  ")}`);
  process.exit(1);
}

console.log(`messages: ${en.keys.size} keys, en/th in sync`);

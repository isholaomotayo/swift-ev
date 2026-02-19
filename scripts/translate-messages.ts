#!/usr/bin/env tsx
/**
 * Translate placeholder messages using free Google Translate API
 * Replaces [LANG] prefixed placeholders with actual translations
 */

import * as fs from "fs";
import * as path from "path";
import { translate } from "@vitalets/google-translate-api";

const languages = [
  // { code: "fr", name: "French" }, // Already translated via inlang CLI
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "ha", name: "Hausa" },
  { code: "yo", name: "Yoruba" },
  { code: "ig", name: "Igbo" },
];

const messagesDir = path.join(process.cwd(), "messages");
const enPath = path.join(messagesDir, "en.json");
const enMessages = JSON.parse(fs.readFileSync(enPath, "utf-8"));

// Helper to detect if a message needs translation
function needsTranslation(key: string, value: string, langCode: string): boolean {
  if (langCode === "en") return false;

  // Skip technical keys
  if (key === "$schema") return false;

  // If it matches English exactly, it likely needs translation
  // (Note: some things like "Swift EV" might stay the same, but Google Translate handled these well usually)
  return value === enMessages[key];
}

// Translate a single text
async function translateText(
  text: string,
  targetLang: string,
  retries = 5
): Promise<string> {
  // If text is purely numeric or special characters, skip
  if (/^[\d\s\W]+$/.test(text)) return text;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await translate(text, { to: targetLang });
      return result.text;
    } catch (error: any) {
      if (i === retries - 1) {
        console.error(`  ⚠️  Failed to translate: "${text.substring(0, 50)}..."`);
        return text;
      }
      const delay = 2000 * (i + 1) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return text;
}

// Process a single language file
async function processLanguage(lang: { code: string; name: string }) {
  const langPath = path.join(messagesDir, `${lang.code}.json`);

  if (!fs.existsSync(langPath)) {
    console.log(`⚠️  ${lang.code}.json not found, skipping...`);
    return;
  }

  const langMessages = JSON.parse(fs.readFileSync(langPath, "utf-8"));
  const keysToTranslate: string[] = [];

  Object.keys(langMessages).forEach((key) => {
    if (needsTranslation(key, langMessages[key], lang.code)) {
      keysToTranslate.push(key);
    }
  });

  if (keysToTranslate.length === 0) {
    console.log(`✅ ${lang.name} (${lang.code}): No messages need translation`);
    return;
  }

  console.log(`\n🌐 Translating ${lang.name} (${lang.code}): ${keysToTranslate.length} messages...`);

  let translated = 0;
  let failed = 0;

  for (let i = 0; i < keysToTranslate.length; i++) {
    const key = keysToTranslate[i];
    try {
      const originalText = enMessages[key];
      const translatedText = await translateText(originalText, lang.code);

      if (translatedText !== originalText) {
        langMessages[key] = translatedText;
        translated++;
      } else {
        // Translation returned same text (common for some technical terms)
        failed++;
      }

      if ((i + 1) % 10 === 0 || i === keysToTranslate.length - 1) {
        process.stdout.write(`  Progress: ${i + 1}/${keysToTranslate.length} (✅ ${translated}, ⚠️  ${failed})\r`);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      failed++;
    }
  }

  // Sort and write
  const sortedMessages: Record<string, string> = {};
  Object.keys(langMessages)
    .sort()
    .forEach((key) => {
      sortedMessages[key] = langMessages[key];
    });

  fs.writeFileSync(
    langPath,
    JSON.stringify(sortedMessages, null, 2) + "\n",
    "utf-8"
  );

  console.log(`\n  ✅ Translated: ${translated}, ❌ Failed/Skipped: ${failed}`);
}

async function main() {
  console.log("🚀 Starting translation of English messages...\n");
  console.log(`📋 Source (en.json): ${Object.keys(enMessages).length} keys\n`);

  for (const lang of languages) {
    await processLanguage(lang);
  }

  console.log("\n✨ Translation complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Review translations in messages/*.json");
  console.log("   2. Run: pnpm paraglide:compile");
  console.log("   3. Test your app with different languages");
}

main().catch((error) => {
  console.error("\n❌ Translation failed:", error);
  process.exit(1);
});

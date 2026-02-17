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

// Helper to detect placeholder translations
function isPlaceholder(text: string, langCode: string): boolean {
  // Handle zh-CN case
  const code = langCode === "zh-CN" ? "ZH" : langCode.toUpperCase();
  return text.startsWith(`[${code}] `);
}

// Helper to extract original text from placeholder
function extractOriginal(text: string, langCode: string): string {
  if (isPlaceholder(text, langCode)) {
    const code = langCode === "zh-CN" ? "ZH" : langCode.toUpperCase();
    return text.replace(`[${code}] `, "");
  }
  return text;
}

// Translate a single text
async function translateText(
  text: string,
  targetLang: string,
  retries = 5
): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await translate(text, { to: targetLang });
      return result.text;
    } catch (error: any) {
      if (i === retries - 1) {
        // Return original text if all retries fail
        console.error(`  ⚠️  Keeping placeholder for: "${text.substring(0, 50)}..."`);
        return text; // Return placeholder instead of throwing
      }
      // Wait before retry (exponential backoff with jitter)
      const delay = 2000 * (i + 1) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return text; // Fallback to original
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
  
  // Find all placeholder translations
  Object.keys(langMessages).forEach((key) => {
    if (isPlaceholder(langMessages[key], lang.code)) {
      keysToTranslate.push(key);
    }
  });

  if (keysToTranslate.length === 0) {
    console.log(`✅ ${lang.name} (${lang.code}): No placeholders to translate`);
    return;
  }

  console.log(`\n🌐 Translating ${lang.name} (${lang.code}): ${keysToTranslate.length} messages...`);

  let translated = 0;
  let failed = 0;

  // Translate sequentially to avoid rate limiting (slower but more reliable)
  for (let i = 0; i < keysToTranslate.length; i++) {
    const key = keysToTranslate[i];
    try {
      const originalText = extractOriginal(langMessages[key], lang.code);
      const translatedText = await translateText(originalText, lang.code);
      
      // Only update if we got a real translation (not placeholder)
      if (!isPlaceholder(translatedText, lang.code)) {
        langMessages[key] = translatedText;
        translated++;
      } else {
        failed++;
      }
      
      if ((i + 1) % 50 === 0 || i === keysToTranslate.length - 1) {
        process.stdout.write(`  Progress: ${i + 1}/${keysToTranslate.length} (✅ ${translated}, ⚠️  ${failed})\r`);
      }
      
      // Delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      failed++;
      if ((i + 1) % 50 === 0) {
        process.stdout.write(`  Progress: ${i + 1}/${keysToTranslate.length} (✅ ${translated}, ⚠️  ${failed})\r`);
      }
    }
  }

  // Write updated file
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

  console.log(`\n  ✅ Translated: ${translated}, ❌ Failed: ${failed}`);
}

// Main function
async function main() {
  console.log("🚀 Starting translation of placeholder messages...\n");
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

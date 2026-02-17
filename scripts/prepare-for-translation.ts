#!/usr/bin/env tsx
/**
 * Prepare message files for translation by removing placeholder prefixes
 * The inlang CLI only translates MISSING keys, not keys with placeholder values
 */
import * as fs from "fs";
import * as path from "path";

const messagesDir = path.join(process.cwd(), "messages");
const languages = ["fr", "zh-CN", "ha", "yo", "ig"];
const enPath = path.join(messagesDir, "en.json");
const enMessages = JSON.parse(fs.readFileSync(enPath, "utf-8"));

languages.forEach((lang) => {
  const filePath = path.join(messagesDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) return;

  const langMessages = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let removed = 0;
  let kept = 0;

  // Remove placeholder prefixes to make keys "missing" for translation
  Object.keys(langMessages).forEach((key) => {
    const value = langMessages[key];
    // Handle zh-CN case for placeholder pattern
    const langCode = lang === "zh-CN" ? "ZH" : lang.toUpperCase();
    const placeholderPattern = new RegExp(`^\\[${langCode}\\] `);
    
    if (typeof value === "string" && placeholderPattern.test(value)) {
      // Remove the key entirely so CLI treats it as missing
      delete langMessages[key];
      removed++;
    } else {
      kept++;
    }
  });

  // Write back without placeholders
  const sortedMessages: Record<string, string> = {};
  Object.keys(langMessages)
    .sort()
    .forEach((key) => {
      sortedMessages[key] = langMessages[key];
    });

  fs.writeFileSync(
    filePath,
    JSON.stringify(sortedMessages, null, 2) + "\n",
    "utf-8"
  );

  console.log(`✅ ${lang}.json: Removed ${removed} placeholders, kept ${kept} existing translations`);
});

console.log("\n✨ Ready for translation! Now run:");
console.log("   INLANG_GOOGLE_TRANSLATE_API_KEY=your-key npx @inlang/cli@latest machine translate --project ./project.inlang --targetLocales fr zh-CN ha yo ig");

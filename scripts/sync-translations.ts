#!/usr/bin/env tsx
/**
 * Sync translation files to match en.json structure
 * Removes keys that don't exist in en.json and adds missing keys with placeholder values
 */

import * as fs from "fs";
import * as path from "path";

const languages = ["fr", "zh-CN", "ha", "yo", "ig"];
const messagesDir = path.join(process.cwd(), "messages");

// Load en.json as the source of truth
const enPath = path.join(messagesDir, "en.json");
const enMessages = JSON.parse(fs.readFileSync(enPath, "utf-8"));
const enKeys = Object.keys(enMessages).sort();

console.log(`📋 Source (en.json): ${enKeys.length} keys\n`);

// Process each language
languages.forEach((lang) => {
  const langPath = path.join(messagesDir, `${lang}.json`);
  
  if (!fs.existsSync(langPath)) {
    console.log(`⚠️  ${lang}.json not found, skipping...`);
    return;
  }
  
  const langMessages = JSON.parse(fs.readFileSync(langPath, "utf-8"));
  const langKeys = Object.keys(langMessages);
  const langKeysSet = new Set(langKeys);
  
  console.log(`🌐 Processing ${lang}.json...`);
  console.log(`   Before: ${langKeys.length} keys`);
  
  // Create new messages object with only keys from en.json
  const newMessages: Record<string, string> = {};
  let kept = 0;
  let added = 0;
  let removed = 0;
  
  enKeys.forEach((key) => {
    if (langKeysSet.has(key)) {
      // Keep existing translation
      newMessages[key] = langMessages[key];
      kept++;
    } else {
      // Add missing key with placeholder (prefix with language code)
      newMessages[key] = `[${lang.toUpperCase()}] ${enMessages[key]}`;
      added++;
    }
  });
  
  // Count removed keys
  removed = langKeys.length - kept;
  
  // Sort keys alphabetically
  const sortedMessages: Record<string, string> = {};
  Object.keys(newMessages)
    .sort()
    .forEach((key) => {
      sortedMessages[key] = newMessages[key];
    });
  
  // Write updated file
  fs.writeFileSync(
    langPath,
    JSON.stringify(sortedMessages, null, 2) + "\n",
    "utf-8"
  );
  
  console.log(`   After:  ${Object.keys(sortedMessages).length} keys`);
  console.log(`   ✅ Kept: ${kept}, ➕ Added: ${added}, ❌ Removed: ${removed}\n`);
});

console.log("✨ Translation sync complete!");
console.log("\n⚠️  Note: Added keys have placeholder translations.");
console.log("   Please review and update translations in the language files.");

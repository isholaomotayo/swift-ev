#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";

const messagesDir = path.join(process.cwd(), "messages");
const languages = ["en", "fr", "zh-CN", "ha", "yo", "ig"];

languages.forEach((lang) => {
  const filePath = path.join(messagesDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    delete content.$schema;
    fs.writeFileSync(
      filePath,
      JSON.stringify(content, null, 2) + "\n",
      "utf-8"
    );
    console.log(`✅ Removed $schema from ${lang}.json`);
  }
});

console.log("\n✨ Done!");

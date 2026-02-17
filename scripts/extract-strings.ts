#!/usr/bin/env tsx
/**
 * Automated string extraction script for Paraglide-js
 * 
 * Scans all TypeScript/TSX files and extracts translatable strings.
 * Filters out false positives like class names, IDs, URLs, etc.
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "@typescript-eslint/typescript-estree";

interface ExtractedString {
  value: string;
  file: string;
  line: number;
  column: number;
  context: string;
  key: string;
}

// Patterns to exclude (false positives)
const EXCLUDE_PATTERNS = [
  /^[a-z-]+$/, // Single lowercase words (likely CSS classes)
  /^[A-Z][a-zA-Z]*$/, // PascalCase (likely component names)
  /^[a-z]+[A-Z]/, // camelCase (likely variable names)
  /^(id|key|name|type|value|href|src|alt|title|aria-|data-)/i, // HTML attributes
  /^(http|https|mailto|tel):/, // URLs
  /^\/[a-z]/, // Paths starting with /
  /^@\//, // Import aliases (e.g., "@/components/...")
  /^\.\.?\//, // Relative paths (e.g., "./file" or "../file")
  /^[a-z-]+\/[a-z-]+/, // Module paths (e.g., "components/ui/button")
  /^#[0-9a-fA-F]{3,6}$/, // Hex colors
  /^\d+$/, // Numbers
  /^[\d\s.]+$/, // Numeric strings with spaces (e.g., "0 0 20 20" - SVG viewBox, coordinates)
  /^[\d\s.-]+$/, // Numeric strings with spaces and dashes (coordinates)
  /^[A-Z_]+$/, // Constants (UPPER_SNAKE_CASE)
  /^(VIN|EV|ID|API|URL|HTTP|HTTPS|JSON|XML)$/i, // Technical terms
  /^[a-z]{1,2}$/, // Single/double letters
  // CSS/Tailwind class patterns
  /^(absolute|fixed|relative|sticky|static|flex|grid|block|inline|hidden|visible)/, // CSS positioning/layout
  /^(bg-|text-|border-|rounded|px-|py-|p-|m-|mx-|my-|mt-|mb-|ml-|mr-|pt-|pb-|pl-|pr-|w-|h-|min-|max-|gap-|space-|col-|row-|opacity-|z-)/, // Tailwind utilities (including margin/padding/opacity)
  /^(sm|md|lg|xl|2xl):/, // Tailwind responsive prefixes (e.g., "lg:col-span-1")
  /^[a-z-]+\s+[a-z-]+/, // Multiple space-separated CSS classes (e.g., "flex items-center")
  /^[a-z-]+\[.*\]/, // Tailwind arbitrary values (e.g., "w-[100px]")
  /^-[a-z]/, // Negative values (e.g., "-z-10")
  /col-span|space-[xy]|grid-cols|flex-col|flex-row/, // Common Tailwind layout classes
  /^(mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|opacity)-\d+(\.\d+)?$/, // Single Tailwind utility classes with numbers (e.g., "mt-1", "opacity-100", "mt-0.5")
  // SVG path data
  /^M[\d\s\-.]+[zZ]?$/i, // SVG path commands (e.g., "M10 0C4.477...")
  /^[MLHVCSQTAZ][\d\s\-.]+/i, // SVG path commands starting with any command letter
];

// Context-based namespace detection
function detectNamespace(filePath: string, context: string): string {
  const normalizedPath = filePath.toLowerCase();
  
  if (normalizedPath.includes("nav") || normalizedPath.includes("header") || normalizedPath.includes("footer")) {
    return "nav";
  }
  if (normalizedPath.includes("home") || normalizedPath.includes("page.tsx") && !normalizedPath.includes("app/")) {
    return "home";
  }
  if (normalizedPath.includes("auth") || normalizedPath.includes("login") || normalizedPath.includes("register")) {
    return "auth";
  }
  if (normalizedPath.includes("form") || normalizedPath.includes("input") || normalizedPath.includes("button")) {
    return "form";
  }
  if (normalizedPath.includes("error") || context.toLowerCase().includes("error")) {
    return "error";
  }
  if (normalizedPath.includes("success") || context.toLowerCase().includes("success")) {
    return "success";
  }
  if (normalizedPath.includes("dashboard")) {
    return "dashboard";
  }
  if (normalizedPath.includes("vehicle") || normalizedPath.includes("auction")) {
    return "vehicle";
  }
  
  return "common";
}

// Generate a Paraglide-compatible key
function generateKey(text: string, namespace: string): string {
  // Clean the text
  let key = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
  
  // Limit length
  if (key.length > 50) {
    key = key.substring(0, 50);
  }
  
  return `${namespace}_${key}`;
}

// Check if string should be excluded
function shouldExclude(text: string): boolean {
  // Exclude empty or very short strings
  if (!text || text.trim().length < 2) {
    return true;
  }
  
  const trimmed = text.trim();
  
  // Exclude strings that match exclude patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  // Exclude strings that look like CSS classes (contains common Tailwind/CSS patterns)
  const cssClassPatterns = [
    /\b(bg-|text-|border-|rounded|px-|py-|p-|m-|mx-|my-|mt-|mb-|ml-|mr-|pt-|pb-|pl-|pr-|w-|h-|min-|max-|gap-|space-[xy]|col-span|row-span|flex|grid|absolute|fixed|relative|hidden|block|inline|items-|justify-|z-|opacity-)/,
    /\b(sm|md|lg|xl|2xl):/, // Tailwind responsive prefixes
    /\b\d+(px|rem|em|%)\b/, // CSS units
    /\[.*\]/, // Tailwind arbitrary values
    /col-span|space-[xy]|grid-cols|flex-col|flex-row/, // Common Tailwind layout classes
    /^(mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|opacity)-\d+(\.\d+)?$/, // Single utility classes (e.g., "mt-1", "opacity-100", "mt-0.5")
  ];
  
  // If string contains CSS class indicators, it's likely a className string
  const cssMatches = cssClassPatterns.filter(pattern => pattern.test(trimmed)).length;
  if (cssMatches >= 1) {
    return true;
  }
  
  // Exclude strings that are exactly a Tailwind utility class (more strict check)
  if (/^(mt|mb|ml|mr|mx|my|pt|pb|pl|pr|px|py|opacity)-\d+(\.\d+)?$/.test(trimmed)) {
    return true;
  }
  
  // Exclude SVG path data (starts with M, L, H, V, C, S, Q, T, A, Z followed by numbers/coordinates)
  if (/^[MLHVCSQTAZ][\d\s\-.]+/i.test(trimmed) && trimmed.length > 10) {
    return true;
  }
  
  // Exclude strings that are mostly numbers or special chars
  const alphanumericRatio = trimmed.replace(/[^a-zA-Z0-9]/g, "").length / trimmed.length;
  if (alphanumericRatio < 0.5) {
    return true;
  }
  
  return false;
}

// Extract strings from AST node
function extractFromNode(node: any, filePath: string, extracted: ExtractedString[]): void {
  if (!node) return;
  
  // Extract JSX text nodes
  if (node.type === "JSXText") {
    const text = node.value?.trim();
    if (text && !shouldExclude(text)) {
      const namespace = detectNamespace(filePath, "");
      extracted.push({
        value: text,
        file: filePath,
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        context: "JSXText",
        key: generateKey(text, namespace),
      });
    }
  }
  
  // Extract string literals
  if (node.type === "Literal" && typeof node.value === "string") {
    const text = node.value.trim();
    if (text && !shouldExclude(text)) {
      // Check parent to determine context
      const parentType = node.parent?.type || "";
      const isAttribute = parentType === "JSXAttribute";
      const attrName = isAttribute ? node.parent?.name?.name || "" : "";
      
      // Skip certain attributes (including className which contains CSS classes)
      if (isAttribute && ["className", "class", "id", "href", "src", "alt", "key", "type", "style"].includes(attrName)) {
        return;
      }
      
      // Also skip if parent's parent is a className attribute (for template literals in className)
      const grandParent = node.parent?.parent;
      if (grandParent?.type === "JSXAttribute" && grandParent?.name?.name === "className") {
        return;
      }
      
      // Skip import/require statements
      const parent = node.parent;
      if (parent && (parent.type === "ImportDeclaration" || parent.type === "CallExpression" && parent.callee?.name === "require")) {
        return;
      }
      
      const namespace = detectNamespace(filePath, attrName);
      extracted.push({
        value: text,
        file: filePath,
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        context: isAttribute ? `JSXAttribute:${attrName}` : "Literal",
        key: generateKey(text, namespace),
      });
    }
  }
  
  // Extract template literals (only if they contain mostly text)
  if (node.type === "TemplateLiteral") {
    const parts = node.quasis?.map((q: any) => q.value?.cooked || "").join("") || "";
    if (parts && parts.length > 5 && !shouldExclude(parts)) {
      const namespace = detectNamespace(filePath, "");
      extracted.push({
        value: parts,
        file: filePath,
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        context: "TemplateLiteral",
        key: generateKey(parts, namespace),
      });
    }
  }
  
  // Recursively process children
  for (const key in node) {
    if (key === "parent" || key === "loc") continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((item) => extractFromNode(item, filePath, extracted));
    } else if (child && typeof child === "object") {
      extractFromNode(child, filePath, extracted);
    }
  }
}

// Process a single file
function processFile(filePath: string): ExtractedString[] {
  const extracted: ExtractedString[] = [];
  
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const ast = parse(content, {
      jsx: true,
      loc: true,
    });
    
    extractFromNode(ast, filePath, extracted);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
  
  return extracted;
}

// Find all TypeScript/TSX files
function findFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!file.startsWith(".") && file !== "node_modules" && file !== ".next" && file !== "dist") {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      // Skip test files and generated files
      if (!file.includes(".test.") && !file.includes(".spec.") && !filePath.includes("node_modules")) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Main function
function main() {
  const rootDir = process.cwd();
  const appDir = path.join(rootDir, "app");
  const componentsDir = path.join(rootDir, "components");
  
  console.log("🔍 Scanning for translatable strings...\n");
  
  const files: string[] = [];
  if (fs.existsSync(appDir)) {
    findFiles(appDir, files);
  }
  if (fs.existsSync(componentsDir)) {
    findFiles(componentsDir, files);
  }
  
  console.log(`Found ${files.length} files to process\n`);
  
  const allExtracted: ExtractedString[] = [];
  
  files.forEach((file) => {
    const extracted = processFile(file);
    allExtracted.push(...extracted);
  });
  
  // Deduplicate by value and generate final keys
  const uniqueStrings = new Map<string, ExtractedString>();
  
  allExtracted.forEach((item) => {
    const normalized = item.value.toLowerCase().trim();
    if (!uniqueStrings.has(normalized)) {
      uniqueStrings.set(normalized, item);
    }
  });
  
  console.log(`\n✅ Extracted ${uniqueStrings.size} unique strings\n`);
  
  // Generate messages/en.json
  const messages: Record<string, string> = {};
  Array.from(uniqueStrings.values()).forEach((item) => {
    messages[item.key] = item.value;
  });
  
  // Sort keys alphabetically
  const sortedMessages: Record<string, string> = {};
  Object.keys(messages)
    .sort()
    .forEach((key) => {
      sortedMessages[key] = messages[key];
    });
  
  // Write to messages/en.json
  const messagesPath = path.join(rootDir, "messages", "en.json");
  fs.writeFileSync(messagesPath, JSON.stringify(sortedMessages, null, 2) + "\n");
  
  console.log(`📝 Written ${Object.keys(sortedMessages).length} messages to ${messagesPath}\n`);
  
  // Generate report
  console.log("📊 Extraction Report:\n");
  const byNamespace = new Map<string, number>();
  Array.from(uniqueStrings.values()).forEach((item) => {
    const ns = item.key.split("_")[0];
    byNamespace.set(ns, (byNamespace.get(ns) || 0) + 1);
  });
  
  Array.from(byNamespace.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([ns, count]) => {
      console.log(`  ${ns}: ${count} strings`);
    });
  
  console.log("\n✨ Done! Review messages/en.json and remove any false positives.\n");
}

main();

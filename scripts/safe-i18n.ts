#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";
import { parse } from "@typescript-eslint/typescript-estree";
import { execSync } from "child_process";

// Configuration
const MESSAGES_PATH = "messages/en.json";
const PARAGLIDE_MESSAGES_IMPORT = 'import * as m from "@/src/paraglide/messages.js";';

interface ExtractedString {
    value: string;
    file: string;
    line: number;
    column: number;
    namespace: string;
    key: string;
}

// Reuse logic from extract-strings.ts but with replacement capability
const EXCLUDE_PATTERNS = [
    /^[a-z-]+$/, /^[A-Z][a-zA-Z]*$/, /^[a-z]+[A-Z]/,
    /^(id|key|name|type|value|href|src|alt|title|aria-|data-)/i,
    /^(http|https|mailto|tel):/, /^\/[a-z]/, /^@\//, /^\.\.?\//,
    /^[a_z-]+\/[a_z-]+/, /^#[0-9a-fA-F]{3,6}$/, /^\d+$/, /^[\d\s.]+$/,
    /^[A-Z_]+$/, /^(VIN|EV|ID|API|URL|HTTP|HTTPS|JSON|XML)$/i, /^[a-z]{1,2}$/,
    /^(bg-|text-|border-|rounded|px-|py-|p-|m-|mx-|my-|mt-|mb-|ml-|mr-|pt-|pb-|pl-|pr-|w-|h-|min-|max-|gap-|space-|col-|row-|opacity-|z-)/,
    /^(sm|md|lg|xl|2xl):/, /^[a-z-]+\s+[a-z-]+/, /^[a-z-]+\[.*\]/, /^-[a-z]/,
    /col-span|space-[xy]|grid-cols|flex-col|flex-row/,
    /^M[\d\s\-.]+[zZ]?$/i, /^[MLHVCSQTAZ][\d\s\-.]+/i,
];

function shouldExclude(text: string): boolean {
    if (!text || text.trim().length < 2) return true;
    const trimmed = text.trim();
    for (const pattern of EXCLUDE_PATTERNS) {
        if (pattern.test(trimmed)) return true;
    }
    return false;
}

function detectNamespace(filePath: string): string {
    const normalizedPath = filePath.toLowerCase();
    if (normalizedPath.includes("nav") || normalizedPath.includes("header") || normalizedPath.includes("footer")) return "nav";
    if (normalizedPath.includes("how-it-works")) return "how_it_works";
    if (normalizedPath.includes("pricing")) return "pricing";
    if (normalizedPath.includes("trust-safety")) return "trust_safety";
    if (normalizedPath.includes("auth") || normalizedPath.includes("login") || normalizedPath.includes("register")) return "auth";
    return "common";
}

function generateKey(text: string, namespace: string): string {
    let key = text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    if (key.length > 50) key = key.substring(0, 50);
    return `${namespace}_${key}`;
}

function processNode(node: any, filePath: string, results: ExtractedString[]) {
    if (!node) return;

    if (node.type === "JSXText" || (node.type === "Literal" && typeof node.value === "string")) {
        const value = node.type === "JSXText" ? node.value.trim() : node.value.trim();
        if (value && !shouldExclude(value)) {
            // Additional check for Literal parents (skip classNames, ids, etc)
            if (node.type === "Literal") {
                const parent = node.parent;
                if (parent?.type === "JSXAttribute" && ["className", "class", "id", "href", "src", "key"].includes(parent.name?.name)) return;
            }

            const namespace = detectNamespace(filePath);
            results.push({
                value,
                file: filePath,
                line: node.loc.start.line,
                column: node.loc.start.column,
                namespace,
                key: generateKey(value, namespace)
            });
        }
    }

    for (const key in node) {
        if (key === "parent" || key === "loc") continue;
        const child = node[key];
        if (Array.isArray(child)) {
            child.forEach(c => processNode(c, filePath, results));
        } else if (child && typeof child === "object") {
            processNode(child, filePath, results);
        }
    }
}

async function run() {
    const files = process.argv.slice(2);
    if (files.length === 0) {
        console.log("Usage: safe-i18n.ts <files...>");
        return;
    }

    const messages = JSON.parse(fs.readFileSync(MESSAGES_PATH, "utf-8"));
    let modified = false;

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const content = fs.readFileSync(file, "utf-8");
        const ast = parse(content, { jsx: true, loc: true });

        const extracted: ExtractedString[] = [];
        processNode(ast, file, extracted);

        if (extracted.length === 0) continue;

        let newContent = content;
        // Add import if needed
        if (!newContent.includes("src/paraglide/messages.js")) {
            const lines = newContent.split("\n");
            const lastImportIndex = lines.findLastIndex(l => l.startsWith("import "));
            lines.splice(lastImportIndex + 1, 0, PARAGLIDE_MESSAGES_IMPORT);
            newContent = lines.join("\n");
        }

        // Sort by position descending to replace without messing up offsets
        extracted.sort((a, b) => (b.line - a.line) || (b.column - a.column));

        for (const item of extracted) {
            if (!messages[item.key]) {
                messages[item.key] = item.value;
                modified = true;
            }

            // Simple string replacement (naive but effective for simple literals/text)
            // For more complex cases, we'd use the AST but this is a starter script
            const placeholder = `{m.${item.key}()}`;
            // This part is tricky without a full-blown refactor tool, but we can do a best effort
            // In JSX text: replace content
            // In Literal: replace 'string' with {m.key()}
        }

        // For now, let's just update messages and report
        console.log(`Found ${extracted.length} strings in ${file}`);
    }

    if (modified) {
        fs.writeFileSync(MESSAGES_PATH, JSON.stringify(messages, null, 2) + "\n");
        console.log("Updated messages/en.json");
        execSync("pnpm paraglide:compile");
    }
}

run();

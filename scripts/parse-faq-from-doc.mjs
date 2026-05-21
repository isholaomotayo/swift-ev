/**
 * Regenerates lib/content/buyer-faq-en.json and seller-faq-en.json from docs/updated-content.md
 * Run: node scripts/parse-faq-from-doc.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const lines = fs.readFileSync(path.join(root, "docs/updated-content.md"), "utf8").split("\n");

const cleanCell = (raw) =>
  raw
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .trim()
    .replace(/\\([.])/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\\/g, "")
    .trim();

const parseSection = (startMarker, endMarker, categoryTitles) => {
  const startIdx = lines.findIndex((l) => l.includes(startMarker));
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(endMarker));
  const slice = lines.slice(startIdx, endIdx > startIdx ? endIdx : startIdx + 900);
  const categories = [];
  let current = null;

  for (let i = 0; i < slice.length; i++) {
    const line = slice[i];
    const catMatch = line.match(/^\|\s*(\d{2})\s*\|\s*/);
    if (catMatch && !/^\|\s*Q\d+/.test(line) && categoryTitles[catMatch[1]]) {
      current = {
        id: `cat${catMatch[1]}`,
        title: categoryTitles[catMatch[1]],
        intro: null,
        questions: [],
      };
      categories.push(current);
      continue;
    }
    const introMatch = line.match(/^\|\s*\|\s*_(.+)_\s*\|/);
    if (introMatch && current) {
      current.intro = introMatch[1].trim();
      continue;
    }
    const qMatch = line.match(/^\|\s*Q(\d+)\s*\|\s*(.+)\|\s*$/);
    if (qMatch && current) {
      const q = cleanCell(qMatch[2]);
      let a = "";
      if (i + 2 < slice.length && slice[i + 1].includes("---")) {
        const parts = slice[i + 2].split("|");
        if (parts.length >= 3) a = cleanCell(parts.slice(2).join("|"));
        i += 2;
      }
      if (q && a.length > 15) current.questions.push({ id: `q${qMatch[1]}`, q, a });
    }
  }

  return categories;
};

const buyerTitles = {
  "01": "Getting Started & Registration",
  "02": "Vehicle Quality & Inspection",
  "03": "Payments, Fees & Escrow",
  "04": "Shipping, Delivery & Timeline",
  "05": "Customs, Duties & Documentation",
  "06": "Insurance & Legal Protection",
  "07": "Auctions, Bidding & Pricing",
  "08": "After Delivery & Disputes",
  "09": "Company Credibility & Trust",
  "10": "Dealers, Partners & Business Buyers",
};

const sellerTitles = {
  "01": "Who Can Sell on autoexports.live",
  "02": "Listing a Vehicle — Requirements & Standards",
  "03": "The Inspection Process",
  "04": "Pricing, Auctions & Reserve",
  "05": "Commissions, Fees & Payouts",
  "06": "The Live Tracking Dashboard",
  "07": "Shipping, Handover & Export",
  "08": "Disputes, Returns & Liability",
  "09": "Growing Your Business on the Platform",
};

const buyer = parseSection(
  "| 01  | Getting Started & Registration",
  "| 01  | Who Can Sell on autoexports.live",
  buyerTitles,
);
const seller = parseSection(
  "| 01  | Who Can Sell on autoexports.live",
  "**2. MEMBERSHIP",
  sellerTitles,
);

const outDir = path.join(root, "lib/content");
fs.writeFileSync(
  path.join(outDir, "buyer-faq-en.json"),
  `${JSON.stringify({ categories: buyer }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(outDir, "seller-faq-en.json"),
  `${JSON.stringify({ categories: seller }, null, 2)}\n`,
);

const buyerCount = buyer.reduce((n, c) => n + c.questions.length, 0);
const sellerCount = seller.reduce((n, c) => n + c.questions.length, 0);
console.log(`Wrote buyer FAQ: ${buyer.length} categories, ${buyerCount} questions`);
console.log(`Wrote seller FAQ: ${seller.length} categories, ${sellerCount} questions`);

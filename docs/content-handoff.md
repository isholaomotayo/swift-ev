# Content Implementation Handoff

**Project:** autoexports.live (swiftEv)  
**Source spec:** `docs/updated-content.md`  
**Handoff date:** May 2026  
**Scope:** Marketing copy, legal copy (draft), FAQ, About page, footer consistency, auction promo

---

## Executive summary

The **priority copy fixes** from the doc summary (items **#1–21**) are implemented in code and English translations. **New pages** were added for About, buyer FAQ, and seller FAQ. Several **large sections** of the 1,849-line doc were **not** applied (full Privacy rewrite, seller ToS in doc, social launch copy, full i18n for FAQ/About bodies).

**Seed is not required** for copy to appear. Seed only helps populate **demo auction rows** in Convex for the homepage auction banner.

---

## What was achieved

### Critical & high priority (summary #1–11)

| # | Issue | Resolution |
|---|--------|------------|
| 1 | Two footer versions across pages | Single `components/layout/footer.tsx` used everywhere; contact from `lib/constants.ts` + `messages` |
| 2 | Multiple conflicting emails | Public contact standardized to **`hello@autoexports.live`**; safety email **`safety@autoexports.live`** |
| 3 | Broken `safety@autoexports.live.live` mailto | Fixed via `SAFETY_EMAIL` constant in `app/trust-safety/page.tsx` |
| 4 | Duplicated hero subheadline on homepage | New key `common_end_to_end_subheadline` on End-to-End section only; hero unchanged |
| 5 | “High-stakes” bidding copy | Replaced with escrow reassurance copy (homepage journey + how-it-works) |
| 6 | “PURE LOGISTICS.” all-caps H1 | `how_it_works_pure_logistics` → “Pure logistics.” |
| 7 | “Weve” + “legendary reliability” | Fixed apostrophes; accountability copy on how-it-works |
| 8 | “Cross the Atlantic” | Indian Ocean / Shanghai → Lagos shipping copy |
| 9 | Trust & safety hero apostrophes | `trust_safety_hero_desc` updated |
| 10 | Fabricated stats (4.2M, 99.98%, etc.) | Removed progress bar / fake %; 2 process-based arbitration cards + honest security pulse quote |
| 11 | Missing buyer ToS | Buyer sections added to `app/terms/page.tsx` with i18n keys `terms_buyer_*`, `terms_escrow_*`, etc. |

### Medium & low priority (summary #12–21)

| # | Issue | Resolution |
|---|--------|------------|
| 12 | Export journey step 02 → `/vehicles` | Changed to **`/auctions`** in `app/page.tsx` |
| 13 | Awkward phase 01 copy | Filter/inspection concrete copy in messages + how-it-works |
| 14 | “Detailed Docs” dead links | Removed from phase cards in `app/how-it-works/page.tsx` |
| 15 | “Review Database” → broken `/faq` | Button → **“Read our FAQ”** linking to `/faq` |
| 16 | Pricing H1 marketing fluff | H1 → **“Membership plans”** |
| 17 | ₦1M fee boundary ambiguous | Message strings + calculator already uses `bidAmount <= 1_000_000` |
| 18 | Unverifiable testimonial | **Removed** from `app/pricing/page.tsx` |
| 19 | Vague footer tagline | Chinese EVs + Abuja · Shanghai copy in `nav_premium_global_vehicle_procurement_and_export_logi` |
| 20 | Business tier duplicate labels | Conditional display in pricing cards; deduped feature list |
| 21 | ToS vs pricing fee confusion | `terms_fee_clarification` + separate seller commission block |

### Additional work (beyond summary table)

| Item | Details |
|------|---------|
| **About page** | `/about` — full story from doc Part One in `lib/content/about-en.json` |
| **Buyer FAQ** | `/faq` — **72 questions**, **10 categories** from doc in `lib/content/buyer-faq-en.json` |
| **Seller FAQ** | `/faq/sellers` — **52 questions**, **9 categories** in `lib/content/seller-faq-en.json` |
| **FAQ UX** | Shared `components/faq/faq-page-content.tsx` with Buyer / Seller toggle |
| **Footer 404 links** | Removed Partner Program, Market Insights, Export License; **About** re-added after page existed |
| **Landed cost display** | `components/autoexports/landed-cost-calculator.tsx` — “Save ₦X” vs “Est. above market by ₦X” |
| **Homepage auction banner** | `components/home/auction-promo-banner.tsx` + `convex/auctions.ts` → `getPromotedAuction` |
| **Seed data (optional)** | `convex/seedData.ts` — scheduled + live auctions with 6 lots each (dev/demo only) |
| **Regeneration script** | `scripts/parse-faq-from-doc.mjs` — rebuild FAQ JSON from markdown |

---

## Key files changed or added

### New files

```
app/about/page.tsx
app/faq/page.tsx                    (refactored to use shared FAQ component)
app/faq/sellers/page.tsx
components/faq/faq-page-content.tsx
components/home/auction-promo-banner.tsx
lib/content/about-en.json
lib/content/about.ts
lib/content/buyer-faq-en.json
lib/content/buyer-faq.ts
lib/content/seller-faq-en.json
lib/content/seller-faq.ts
scripts/parse-faq-from-doc.mjs
docs/content-handoff.md               (this file)
```

### Modified files (main)

```
lib/constants.ts                      SUPPORT_EMAIL, SAFETY_EMAIL, CONTACT_INFO.EMAIL
components/layout/footer.tsx          Contact, tagline, link set, grid layout
app/page.tsx                          Journey link, End-to-End copy, AuctionPromoBanner
app/how-it-works/page.tsx             H1, removed Detailed Docs, id="faq" anchor
app/trust-safety/page.tsx               Email, stats, FAQ link
app/pricing/page.tsx                  H1, testimonial removed, Business tier UI
app/terms/page.tsx                    Buyer ToS sections (i18n)
components/autoexports/landed-cost-calculator.tsx
convex/auctions.ts                    getPromotedAuction query
convex/seedData.ts                    Scheduled + live auction seed (optional)
messages/en.json                      Copy keys + terms + about + faq UI
messages/fr.json                      Partial UI translations
messages/yo.json                      Partial UI translations
messages/zh-CN.json                   Partial UI translations
```

---

## Canonical contact & branding

| Use case | Value |
|----------|--------|
| Primary public email | `hello@autoexports.live` |
| Trust & safety email | `safety@autoexports.live` |
| Phone | `+2349167706772 / +8615914293428` |
| Address | Plot 777, Wole Olanipekun Street, CBD, Abuja |

Defined in `lib/constants.ts` (`SUPPORT_EMAIL`, `SAFETY_EMAIL`, `CONTACT_INFO`).

---

## Content architecture

### Paraglide / `messages/*.json`

- **Marketing pages** (home, how-it-works, trust-safety, pricing, terms UI labels): string keys in `messages/en.json` (and partial `fr`, `yo`, `zh-CN`).
- Run **`pnpm paraglide:compile`** after editing message files.

### JSON content modules (English body copy)

| Module | Loader | Locales |
|--------|--------|---------|
| Buyer FAQ | `lib/content/buyer-faq.ts` | `en` only (`buyer-faq-en.json`) |
| Seller FAQ | `lib/content/seller-faq.ts` | `en` only (`seller-faq-en.json`) |
| About | `lib/content/about.ts` | `en` only (`about-en.json`) |

Non-English locales **fall back to English** for FAQ/About body text until separate JSON files are added (e.g. `buyer-faq-fr.json`).

### Updating FAQ from the doc

```bash
node scripts/parse-faq-from-doc.mjs
```

Then verify counts in console output and test `/faq` and `/faq/sellers`.

---

## Homepage auction banner

**Component:** `components/home/auction-promo-banner.tsx`  
**Query:** `api.auctions.getPromotedAuction`

**Logic:**

1. Prefer any auction with `status === "live"`.
2. Else next `status === "scheduled"` with `scheduledStart > now` and at least one lot.
3. Else earliest scheduled with lots.
4. If none → banner hidden.

**Data:** Comes from **Convex**, not static content. Create auctions via **Admin → Auctions** or optional dev seed (`convex/seedData.ts`). **Do not run dev seed on production** unless that is your intentional process.

---

## Verification checklist

### Public pages

- [ ] Homepage: End-to-End subheadline differs from hero; step 02 links to `/auctions`
- [ ] Footer: same email/phone/address on `/`, `/auctions`, `/pricing`, `/how-it-works`
- [ ] `/about` — all sections render
- [ ] `/faq` — 72 questions, search works, Buyer/Seller toggle
- [ ] `/faq/sellers` — seller content loads
- [ ] `/trust-safety` — safety mailto works; no fake % stats; FAQ button → `/faq`
- [ ] `/how-it-works` — “Pure logistics.” H1; no Detailed Docs rows
- [ ] `/pricing` — “Membership plans” H1; no testimonial block; fee tier wording
- [ ] `/terms` — buyer sections present; seller commission clarification
- [ ] Vehicle detail: landed cost shows “Save” or “above market” correctly

### After `pnpm paraglide:compile`

- [ ] No missing message errors in dev console

### Auction banner (optional)

- [ ] At least one `live` or future `scheduled` auction with lots in Convex
- [ ] Banner appears on homepage

---

## Not done / outstanding

### From `updated-content.md` (not fully applied)

| Area | Notes |
|------|--------|
| **Full Privacy Policy** (doc §§1–11, ~line 1100+) | `/privacy` still uses existing hardcoded content, not full doc rewrite |
| **Seller Terms** in doc (listing, inspection, payouts, etc.) | Not added to `/terms`; only buyer blocks + seller commission summary |
| **Legal disclaimers** (doc ~1030+) | Not published as pages |
| **Social media launch series** (About Part Two) | Not implemented |
| **60 seller FAQ** | Parser yields **52** Q&As from current doc slice; gap may be doc structure / end marker |
| **Full i18n** for FAQ/About bodies | English JSON only; `fr`/`yo`/`zh-CN` UI strings partially updated |
| **Market value estimate** | Display fixed; underlying `currentBid * 1.4` heuristic unchanged |
| **VoltBid / old branding** in doc | Not audited site-wide |

### Stale but low-risk

- Old message keys may still exist in `messages/*.json` (e.g. `4.2 million`, `99.98%`, `Your Gateway`) but are **unused** on updated pages.
- **Admin/mail** defaults still reference `buy@autoexports.live` / `buy@autoexport.live` in:
  - `convex/adminMail.ts`
  - `convex/userMail.ts`
  - `components/admin/mail-client.tsx`
  - `components/user/mail-client.tsx`  
  Public marketing contact is separate; align if outbound mail should match `hello@`.

### Operational (not copy)

- Live bidding UX depends on **real auction lifecycle** in admin (schedule → start → lots active).
- Vehicle pages showing “Bidding Closed” until auctions/lots are correctly configured.

---

## Recommended follow-up (priority order)

1. **Legal review** — Buyer ToS added as draft copy; have counsel review before marketing push.
2. **Privacy page** — Port doc sections into `/privacy` (or i18n + content module pattern like FAQ).
3. **Seller ToS** — Add seller sections from doc to `/terms` or `/terms/sellers`.
4. **Email alignment** — Decide single outbound domain; update Convex mail defaults if needed.
5. **i18n** — Add `buyer-faq-fr.json`, `about-fr.json`, etc., or machine-translate via inlang pipeline.
6. **Clean messages** — Remove obsolete keys (`common_our_systems_analyze_*`, old trust stats) after grep confirms unused.
7. **Production auctions** — Configure real scheduled/live events in admin (no seed on prod).

---

## Commands reference

```bash
# Recompile translations after messages/*.json edits
pnpm paraglide:compile

# Regenerate FAQ JSON from doc
node scripts/parse-faq-from-doc.mjs

# Typecheck
pnpm exec tsc --noEmit

# Dev server
pnpm dev
```

---

## Contacts for questions

- **Content source of truth:** `docs/updated-content.md`
- **This implementation summary:** `docs/content-handoff.md`
- **FAQ data:** `lib/content/buyer-faq-en.json`, `lib/content/seller-faq-en.json`

---

*End of handoff.*

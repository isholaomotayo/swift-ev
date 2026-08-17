/**
 * Vehicle Make & Model Deduplication and Pattern Matching Engine
 * 
 * Provides case-insensitive normalization, punctuation/whitespace stripping,
 * Levenshtein distance, bigram similarity, and fuzzy pattern matching
 * to prevent duplicate vehicle makes and models from entering the catalog.
 */

// Well-known automotive acronyms that should be uppercase
const KNOWN_ACRONYMS = new Set([
  "BYD", "BMW", "GMC", "NIO", "GAC", "BAIC", "FAW", "SAIC", "JMC", "SWM",
  "RAM", "MG", "AITO", "IM", "ARCFOX", "ORA", "LEVC", "EV", "PHEV", "SUV",
  "MPV", "GT", "RS", "AMG", "M", "STI", "WRX", "TRD", "ST", "SV", "SVR",
]);

// Common automotive stop words or suffixes to ignore in fuzzy comparisons
const SUFFIX_NOISE_WORDS = [
  "motors", "motor", "automotive", "automobile", "auto", "group", "co", "corp",
  "corporation", "ltd", "limited", "inc", "company", "cars", "vehicles"
];

/**
 * Strips whitespace, accents, and non-alphanumeric characters, returning a pure lowercase key.
 * e.g., "Mercedes-Benz " -> "mercedesbenz"
 * e.g., "B.Y.D." -> "byd"
 * e.g., "Model 3 Long-Range" -> "model3longrange"
 */
export function toNormalizedKey(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // Strip all non-alphanumeric
}

/**
 * Cleans string for token matching: lowercase, trimmed, punctuation replaced with spaces.
 * e.g., "Mercedes-Benz, Co." -> "mercedes benz co"
 */
export function cleanText(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Removes noise words (e.g., "motors", "group") for core brand matching.
 */
export function stripNoiseWords(str: string): string {
  const cleaned = cleanText(str);
  const words = cleaned.split(" ").filter((w) => w.length > 0);
  const filtered = words.filter((w) => !SUFFIX_NOISE_WORDS.includes(w));
  return filtered.length > 0 ? filtered.join(" ") : cleaned;
}

/**
 * Formats a user-submitted make or model into canonical casing.
 * Handles acronyms (BYD, BMW) and title case with hyphens (Mercedes-Benz, Rolls-Royce).
 */
export function formatCanonicalName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  // If entire input matches a known acronym ignoring case
  const upper = trimmed.toUpperCase();
  if (KNOWN_ACRONYMS.has(upper)) {
    return upper;
  }

  // Handle words split by spaces and hyphens
  const formatWord = (word: string): string => {
    if (!word) return "";
    const wUpper = word.toUpperCase();
    if (KNOWN_ACRONYMS.has(wUpper)) return wUpper;
    
    // Check if alphanumeric combo like "SU7", "P7", "ET5", "EV6", "iX3", "ID.4"
    if (/^[a-zA-Z]+\d+$/.test(word) && word.length <= 5) {
      return word.toUpperCase();
    }
    
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  // Split by hyphens preserving structure
  return trimmed
    .split(" ")
    .map((spaceChunk) =>
      spaceChunk
        .split("-")
        .map(formatWord)
        .join("-")
    )
    .join(" ");
}

/**
 * Calculates standard Levenshtein edit distance between two strings.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates bigram Dice coefficient (0.0 to 1.0).
 */
function calculateBigramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length < 2 || b.length < 2) return 0.0;

  const getBigrams = (str: string): Map<string, number> => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }
    return bigrams;
  };

  const bgA = getBigrams(a);
  const bgB = getBigrams(b);

  let intersection = 0;
  for (const [bg, countA] of bgA.entries()) {
    const countB = bgB.get(bg) ?? 0;
    intersection += Math.min(countA, countB);
  }

  const total = (a.length - 1) + (b.length - 1);
  return (2.0 * intersection) / total;
}

/**
 * Computes comprehensive string similarity (0.0 to 1.0)
 * considering normalized keys, Levenshtein ratio, token sets, and bigrams.
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const norm1 = toNormalizedKey(str1);
  const norm2 = toNormalizedKey(str2);

  if (!norm1 || !norm2) return 0.0;
  if (norm1 === norm2) return 1.0;

  // Cleaned token comparison
  const clean1 = stripNoiseWords(str1);
  const clean2 = stripNoiseWords(str2);
  const cleanNorm1 = toNormalizedKey(clean1);
  const cleanNorm2 = toNormalizedKey(clean2);

  if (cleanNorm1 === cleanNorm2) return 0.98;

  // Levenshtein ratio
  const maxLen = Math.max(norm1.length, norm2.length);
  const levDist = calculateLevenshteinDistance(norm1, norm2);
  const levScore = 1.0 - levDist / maxLen;

  // Bigram Dice score
  const bigramScore = calculateBigramSimilarity(norm1, norm2);

  // Token set similarity (for multi-word comparisons)
  const tokens1 = new Set(clean1.split(" "));
  const tokens2 = new Set(clean2.split(" "));
  let tokenMatches = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) tokenMatches++;
  }
  const tokenScore = (2 * tokenMatches) / (tokens1.size + tokens2.size);

  return Math.max(levScore * 0.5 + bigramScore * 0.5, tokenScore * 0.9, levScore);
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: "exact" | "case_insensitive" | "normalized" | "alias" | "fuzzy";
  matchedItem?: string;
  similarity?: number;
  message?: string;
  suggestedAction?: "reject" | "use_existing" | "allow";
}

export interface MakeCatalogItem {
  make: string;
  aliases?: string[];
  models?: string[];
}

/**
 * Checks a new make against existing makes for case-sensitive, case-insensitive,
 * normalized key, alias, and fuzzy duplicates.
 */
export function checkDuplicateMake(
  candidateMake: string,
  existingMakes: MakeCatalogItem[],
  fuzzyThreshold = 0.82
): DuplicateCheckResult {
  const trimmed = candidateMake.trim();
  if (!trimmed) {
    return {
      isDuplicate: true,
      message: "Make name cannot be empty.",
      suggestedAction: "reject",
    };
  }

  const candidateNorm = toNormalizedKey(trimmed);
  const candidateClean = stripNoiseWords(trimmed);
  const candidateCleanNorm = toNormalizedKey(candidateClean);

  let bestFuzzyMatch: { make: string; score: number } | null = null;

  for (const item of existingMakes) {
    const existingMake = item.make;
    const existingNorm = toNormalizedKey(existingMake);

    // 1. Exact match
    if (existingMake === trimmed) {
      return {
        isDuplicate: true,
        matchType: "exact",
        matchedItem: existingMake,
        similarity: 1.0,
        message: `Make "${existingMake}" already exists.`,
        suggestedAction: "use_existing",
      };
    }

    // 2. Case-insensitive match
    if (existingMake.toLowerCase() === trimmed.toLowerCase()) {
      return {
        isDuplicate: true,
        matchType: "case_insensitive",
        matchedItem: existingMake,
        similarity: 1.0,
        message: `Make "${existingMake}" already exists (case-insensitive match).`,
        suggestedAction: "use_existing",
      };
    }

    // 3. Normalized alphanumeric key match (e.g. "Mercedes-Benz" vs "Mercedes Benz")
    if (existingNorm === candidateNorm) {
      return {
        isDuplicate: true,
        matchType: "normalized",
        matchedItem: existingMake,
        similarity: 1.0,
        message: `Make "${existingMake}" already exists with a different punctuation/format.`,
        suggestedAction: "use_existing",
      };
    }

    // 4. Cleaned noise words match (e.g. "Tesla Motors" vs "Tesla")
    const existingCleanNorm = toNormalizedKey(stripNoiseWords(existingMake));
    if (existingCleanNorm === candidateCleanNorm && candidateCleanNorm.length >= 3) {
      return {
        isDuplicate: true,
        matchType: "normalized",
        matchedItem: existingMake,
        similarity: 0.98,
        message: `Make "${existingMake}" already exists.`,
        suggestedAction: "use_existing",
      };
    }

    // 5. Aliases match
    if (item.aliases && Array.isArray(item.aliases)) {
      for (const alias of item.aliases) {
        if (
          alias.toLowerCase() === trimmed.toLowerCase() ||
          toNormalizedKey(alias) === candidateNorm
        ) {
          return {
            isDuplicate: true,
            matchType: "alias",
            matchedItem: existingMake,
            similarity: 1.0,
            message: `"${trimmed}" is a known alias for "${existingMake}".`,
            suggestedAction: "use_existing",
          };
        }
      }
    }

    // 6. Fuzzy pattern matching
    const sim = calculateStringSimilarity(trimmed, existingMake);
    if (sim >= fuzzyThreshold) {
      if (!bestFuzzyMatch || sim > bestFuzzyMatch.score) {
        bestFuzzyMatch = { make: existingMake, score: sim };
      }
    }
  }

  if (bestFuzzyMatch) {
    return {
      isDuplicate: true,
      matchType: "fuzzy",
      matchedItem: bestFuzzyMatch.make,
      similarity: Number(bestFuzzyMatch.score.toFixed(3)),
      message: `A similar make "${bestFuzzyMatch.make}" already exists (${Math.round(bestFuzzyMatch.score * 100)}% match). Did you mean "${bestFuzzyMatch.make}"?`,
      suggestedAction: "use_existing",
    };
  }

  return {
    isDuplicate: false,
    suggestedAction: "allow",
  };
}

/**
 * Checks a new model against existing models within a make for duplicates.
 */
export function checkDuplicateModel(
  candidateModel: string,
  existingModels: string[],
  fuzzyThreshold = 0.85
): DuplicateCheckResult {
  const trimmed = candidateModel.trim();
  if (!trimmed) {
    return {
      isDuplicate: true,
      message: "Model name cannot be empty.",
      suggestedAction: "reject",
    };
  }

  const candidateNorm = toNormalizedKey(trimmed);
  let bestFuzzyMatch: { model: string; score: number } | null = null;

  for (const model of existingModels) {
    const modelNorm = toNormalizedKey(model);

    // 1. Exact match
    if (model === trimmed) {
      return {
        isDuplicate: true,
        matchType: "exact",
        matchedItem: model,
        similarity: 1.0,
        message: `Model "${model}" already exists for this make.`,
        suggestedAction: "use_existing",
      };
    }

    // 2. Case-insensitive match
    if (model.toLowerCase() === trimmed.toLowerCase()) {
      return {
        isDuplicate: true,
        matchType: "case_insensitive",
        matchedItem: model,
        similarity: 1.0,
        message: `Model "${model}" already exists (case-insensitive match).`,
        suggestedAction: "use_existing",
      };
    }

    // 3. Normalized key match (e.g. "Model-3" vs "Model 3" vs "model 3")
    if (modelNorm === candidateNorm) {
      return {
        isDuplicate: true,
        matchType: "normalized",
        matchedItem: model,
        similarity: 1.0,
        message: `Model "${model}" already exists with a different punctuation/format.`,
        suggestedAction: "use_existing",
      };
    }

    // 4. Fuzzy similarity (for longer model names)
    if (trimmed.length >= 4 && model.length >= 4) {
      const sim = calculateStringSimilarity(trimmed, model);
      if (sim >= fuzzyThreshold) {
        if (!bestFuzzyMatch || sim > bestFuzzyMatch.score) {
          bestFuzzyMatch = { model, score: sim };
        }
      }
    }
  }

  if (bestFuzzyMatch) {
    return {
      isDuplicate: true,
      matchType: "fuzzy",
      matchedItem: bestFuzzyMatch.model,
      similarity: Number(bestFuzzyMatch.score.toFixed(3)),
      message: `A similar model "${bestFuzzyMatch.model}" already exists (${Math.round(bestFuzzyMatch.score * 100)}% match). Did you mean "${bestFuzzyMatch.model}"?`,
      suggestedAction: "use_existing",
    };
  }

  return {
    isDuplicate: false,
    suggestedAction: "allow",
  };
}

/**
 * Convex backend vehicle deduplication and pattern matching helpers.
 */
export {
  toNormalizedKey,
  cleanText,
  stripNoiseWords,
  formatCanonicalName,
  calculateLevenshteinDistance,
  calculateStringSimilarity,
  checkDuplicateMake,
  checkDuplicateModel,
  type DuplicateCheckResult,
  type MakeCatalogItem,
} from "../../lib/vehicle-dedup";

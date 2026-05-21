import sellerFaqEn from "./seller-faq-en.json";
import type { FaqCategory } from "./buyer-faq";

type FaqData = {
  categories: FaqCategory[];
};

const faqByLocale: Record<string, FaqData> = {
  en: sellerFaqEn as FaqData,
};

export const getSellerFaqCategories = (locale: string): FaqCategory[] => {
  const data = faqByLocale[locale] ?? faqByLocale.en;
  return data.categories;
};

export const getSellerFaqQuestionCount = (locale: string): number =>
  getSellerFaqCategories(locale).reduce(
    (total, category) => total + category.questions.length,
    0,
  );

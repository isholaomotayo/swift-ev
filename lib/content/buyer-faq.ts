import buyerFaqEn from "./buyer-faq-en.json";

export type FaqQuestion = {
  id: string;
  q: string;
  a: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  intro: string | null;
  questions: FaqQuestion[];
};

type FaqData = {
  categories: FaqCategory[];
};

const faqByLocale: Record<string, FaqData> = {
  en: buyerFaqEn as FaqData,
};

export const getBuyerFaqCategories = (locale: string): FaqCategory[] => {
  const data = faqByLocale[locale] ?? faqByLocale.en;
  return data.categories;
};

export const getBuyerFaqQuestionCount = (locale: string): number =>
  getBuyerFaqCategories(locale).reduce(
    (total, category) => total + category.questions.length,
    0,
  );

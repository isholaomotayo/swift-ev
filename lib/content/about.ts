import aboutEn from "./about-en.json";

export type AboutPartner = {
  name: string;
  location: string;
  description: string;
};

export type AboutOffering = {
  title: string;
  description: string;
};

export type AboutContent = {
  hero: { title: string; description: string };
  story: {
    title: string;
    quote: string;
    paragraphs: string[];
  };
  discovery: {
    title: string;
    intro: string;
    partners: AboutPartner[];
    closing: string;
  };
  whoWeAre: { title: string; paragraphs: string[] };
  offerings: {
    title: string;
    intro: string;
    items: AboutOffering[];
  };
  mission: { title: string; quote: string; closing: string };
  cta: { title: string; description: string };
};

const aboutByLocale: Record<string, AboutContent> = {
  en: aboutEn as AboutContent,
};

export const getAboutContent = (locale: string): AboutContent =>
  aboutByLocale[locale] ?? aboutByLocale.en;

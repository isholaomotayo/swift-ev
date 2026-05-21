"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FaqPageContent } from "@/components/faq/faq-page-content";
import {
  getSellerFaqCategories,
  getSellerFaqQuestionCount,
} from "@/lib/content/seller-faq";
import { getLocale } from "@/src/paraglide/runtime.js";

export default function SellerFAQPage() {
  const locale = getLocale();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-all duration-300 selection:bg-electric-blue/30">
      <Header />
      <main className="flex-1">
        <FaqPageContent
          audience="sellers"
          categories={getSellerFaqCategories(locale)}
          questionCount={getSellerFaqQuestionCount(locale)}
        />
      </main>
      <Footer />
    </div>
  );
}

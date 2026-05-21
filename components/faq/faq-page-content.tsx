"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FaqCategory } from "@/lib/content/buyer-faq";
import * as m from "@/src/paraglide/messages.js";

type FaqAudience = "buyers" | "sellers";

interface FaqPageContentProps {
  audience: FaqAudience;
  categories: FaqCategory[];
  questionCount: number;
}

export const FaqPageContent = ({
  audience,
  categories,
  questionCount,
}: FaqPageContentProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

  const toggleQuestion = (id: string) => {
    const newOpen = new Set(openQuestions);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenQuestions(newOpen);
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.a.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.questions.length > 0);

  const displayCategories = selectedCategory
    ? filteredCategories.filter((c) => c.id === selectedCategory)
    : filteredCategories;

  const subtitle =
    audience === "buyers"
      ? m.faq_buyer_database_subtitle({ count: String(questionCount) })
      : m.faq_seller_database_subtitle({ count: String(questionCount) });

  return (
    <>
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-border">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-blue/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-volt-green/5 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10 dark:opacity-20 translate-y-20" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <Badge className="mb-8 px-4 py-1.5 rounded-full bg-primary/5 text-primary border-primary/10 backdrop-blur-md uppercase tracking-widest font-bold text-[10px]">
            {m.faq_support_center()}
          </Badge>
          <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-8">
            {m.faq_knowledge_database().split(" ")[0]}{" "}
            <span className="text-gradient">
              {m.faq_knowledge_database().split(" ").slice(1).join(" ")}
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            {audience === "buyers" ? m.faq_find_answers() : m.faq_seller_find_answers()}
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-8">{subtitle}</p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Button
              variant={audience === "buyers" ? "default" : "outline"}
              className="rounded-full font-bold"
              asChild
            >
              <Link href="/faq">{m.faq_audience_buyers()}</Link>
            </Button>
            <Button
              variant={audience === "sellers" ? "default" : "outline"}
              className="rounded-full font-bold"
              asChild
            >
              <Link href="/faq/sellers">{m.faq_audience_sellers()}</Link>
            </Button>
          </div>

          <div className="max-w-2xl mx-auto relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-electric-blue transition-colors" />
            <Input
              type="text"
              placeholder={m.faq_search_placeholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-16 pl-14 pr-6 rounded-2xl text-lg bg-card/50 backdrop-blur-sm border-border/40 focus:bg-background transition-all shadow-xl shadow-black/5"
            />
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 overflow-x-auto scrollbar-hide">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all",
              !selectedCategory
                ? "bg-foreground text-background shadow-lg shadow-black/10"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {m.faq_all_categories()}
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all",
                selectedCategory === cat.id
                  ? "bg-foreground text-background shadow-lg shadow-black/10"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {cat.title}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto space-y-24">
          {displayCategories.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-32">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-3xl font-black tracking-tight">{category.title}</h2>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              {category.intro && (
                <p className="text-muted-foreground mb-8 leading-relaxed italic">
                  {category.intro}
                </p>
              )}

              <div className="grid gap-4">
                {category.questions.map((q) => {
                  const id = `${category.id}-${q.id}`;
                  const isOpen = openQuestions.has(id);

                  return (
                    <div
                      key={id}
                      className={cn(
                        "group rounded-2xl border transition-all duration-300",
                        isOpen
                          ? "bg-muted/30 border-primary/20 shadow-lg"
                          : "bg-card hover:bg-muted/20 border-border/40",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleQuestion(id)}
                        className="w-full flex items-center justify-between p-6 md:p-8 text-left"
                      >
                        <span className="font-bold text-lg md:text-xl pr-8 tracking-tight">
                          {q.q}
                        </span>
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 transition-transform duration-300",
                            isOpen && "rotate-180 bg-primary/10 text-primary",
                          )}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </button>
                      <div
                        className={cn(
                          "grid transition-all duration-300 ease-in-out px-6 md:px-8",
                          isOpen
                            ? "grid-rows-[1fr] pb-8 opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="text-muted-foreground text-base leading-relaxed whitespace-pre-line pt-2 border-t border-border/10">
                            {q.a}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {displayCategories.length === 0 && (
            <div className="text-center py-24 glass-morphism rounded-[3rem] border border-dashed">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-2">{m.faq_no_results()}</h3>
              <p className="text-muted-foreground">
                {m.faq_we_couldnt_find()} &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </div>

      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
                {m.faq_still_need_help()}
              </h2>
              <p className="text-background/60 text-lg max-w-md">
                {audience === "buyers"
                  ? m.faq_specialist_support_desc()
                  : m.faq_seller_support_desc()}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 shrink-0">
              {audience === "buyers" && (
                <Button
                  size="lg"
                  className="h-16 px-10 rounded-full bg-electric-blue hover:bg-electric-blue/90 text-white font-black text-lg"
                  asChild
                >
                  <Link href="/guide">{m.faq_read_member_guide()}</Link>
                </Button>
              )}
              {audience === "sellers" && (
                <Button
                  size="lg"
                  className="h-16 px-10 rounded-full bg-electric-blue hover:bg-electric-blue/90 text-white font-black text-lg"
                  asChild
                >
                  <Link href="/register">{m.faq_seller_register()}</Link>
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-16 px-10 rounded-full border-background/20 hover:bg-background/10 text-background font-black text-lg"
                asChild
              >
                <a href={`mailto:${m.faq_email_support_addr()}`}>{m.faq_email_support()}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

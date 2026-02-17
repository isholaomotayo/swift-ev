"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as m from "@/src/paraglide/messages.js";

interface FAQQuestion {
    q: string;
    a: string;
}

interface FAQCategory {
    id: string;
    title: string;
    questions: FAQQuestion[];
}

export default function FAQPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

    const faqCategories: FAQCategory[] = [
        {
            id: "general",
            title: m.faq_category_general(),
            questions: [
                { q: m.faq_general_q1(), a: m.faq_general_a1() },
                { q: m.faq_general_q2(), a: m.faq_general_a2() },
                { q: m.faq_general_q3(), a: m.faq_general_a3() },
                { q: m.faq_general_q4(), a: m.faq_general_a4() },
            ],
        },
        {
            id: "buyers",
            title: m.faq_category_buyers(),
            questions: [
                { q: m.faq_buyers_q1(), a: m.faq_buyers_a1() },
                { q: m.faq_buyers_q2(), a: m.faq_buyers_a2() },
                { q: m.faq_buyers_q3(), a: m.faq_buyers_a3() },
                { q: m.faq_buyers_q4(), a: m.faq_buyers_a4() },
                { q: m.faq_buyers_q5(), a: m.faq_buyers_a5() },
                { q: m.faq_buyers_q6(), a: m.faq_buyers_a6() },
                { q: m.faq_buyers_q7(), a: m.faq_buyers_a7() },
                { q: m.faq_buyers_q8(), a: m.faq_buyers_a8() },
            ],
        },
        {
            id: "sellers",
            title: m.faq_category_sellers(),
            questions: [
                { q: m.faq_sellers_q1(), a: m.faq_sellers_a1() },
                { q: m.faq_sellers_q2(), a: m.faq_sellers_a2() },
                { q: m.faq_sellers_q3(), a: m.faq_sellers_a3() },
                { q: m.faq_sellers_q4(), a: m.faq_sellers_a4() },
                { q: m.faq_sellers_q5(), a: m.faq_sellers_a5() },
            ],
        },
        {
            id: "payments",
            title: m.faq_category_payments(),
            questions: [
                { q: m.faq_payments_q1(), a: m.faq_payments_a1() },
                { q: m.faq_payments_q2(), a: m.faq_payments_a2() },
                { q: m.faq_payments_q3(), a: m.faq_payments_a3() },
            ],
        },
        {
            id: "shipping",
            title: m.faq_category_shipping(),
            questions: [
                { q: m.faq_shipping_q1(), a: m.faq_shipping_a1() },
                { q: m.faq_shipping_q2(), a: m.faq_shipping_a2() },
                { q: m.faq_shipping_q3(), a: m.faq_shipping_a3() },
            ],
        },
        {
            id: "disputes",
            title: m.faq_category_disputes(),
            questions: [
                { q: m.faq_disputes_q1(), a: m.faq_disputes_a1() },
                { q: m.faq_disputes_q2(), a: m.faq_disputes_a2() },
                { q: m.faq_disputes_q3(), a: m.faq_disputes_a3() },
                { q: m.faq_disputes_q4(), a: m.faq_disputes_a4() },
            ],
        },
    ];

    const toggleQuestion = (id: string) => {
        const newOpen = new Set(openQuestions);
        if (newOpen.has(id)) {
            newOpen.delete(id);
        } else {
            newOpen.add(id);
        }
        setOpenQuestions(newOpen);
    };

    const filteredCategories = faqCategories.map(cat => ({
        ...cat,
        questions: cat.questions.filter(q =>
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.questions.length > 0);

    const displayCategories = selectedCategory
        ? filteredCategories.filter(c => c.id === selectedCategory)
        : filteredCategories;

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground transition-all duration-300 selection:bg-electric-blue/30">
            <Header />
            <main className="flex-1">
                {/* Hero Section - Immersive */}
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
                            {m.faq_knowledge_database().split(" ")[0]} <span className="text-gradient">{m.faq_knowledge_database().split(" ").slice(1).join(" ")}</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                            {m.faq_find_answers()}
                        </p>

                        {/* Search Bar - Sophisticated */}
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

                {/* Category Navigation - Sticky */}
                <div className="sticky top-16 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 overflow-x-auto scrollbar-hide">
                    <div className="container mx-auto px-4 py-4 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={cn(
                                "px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all",
                                !selectedCategory
                                    ? "bg-foreground text-background shadow-lg shadow-black/10"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            {m.faq_all_categories()}
                        </button>
                        {faqCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={cn(
                                    "px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all",
                                    selectedCategory === cat.id
                                        ? "bg-foreground text-background shadow-lg shadow-black/10"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {cat.title}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FAQ Grid Content */}
                <div className="container mx-auto px-4 py-24">
                    <div className="max-w-4xl mx-auto space-y-24">
                        {displayCategories.map((category) => (
                            <div key={category.id} id={category.id} className="scroll-mt-32">
                                <div className="flex items-center gap-4 mb-8">
                                    <h2 className="text-3xl font-black tracking-tight">{category.title}</h2>
                                    <div className="h-px flex-1 bg-border/40" />
                                </div>

                                <div className="grid gap-4">
                                    {category.questions.map((q, i) => {
                                        const id = `${category.id}-${i}`;
                                        const isOpen = openQuestions.has(id);

                                        return (
                                            <div
                                                key={id}
                                                className={cn(
                                                    "group rounded-2xl border transition-all duration-300",
                                                    isOpen
                                                        ? "bg-muted/30 border-primary/20 shadow-lg"
                                                        : "bg-card hover:bg-muted/20 border-border/40"
                                                )}
                                            >
                                                <button
                                                    onClick={() => toggleQuestion(id)}
                                                    className="w-full flex items-center justify-between p-6 md:p-8 text-left"
                                                >
                                                    <span className="font-bold text-lg md:text-xl pr-8 tracking-tight">{q.q}</span>
                                                    <div className={cn(
                                                        "flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 transition-transform duration-300",
                                                        isOpen && "rotate-180 bg-primary/10 text-primary"
                                                    )}>
                                                        <ChevronDown className="h-5 w-5" />
                                                    </div>
                                                </button>
                                                <div className={cn(
                                                    "grid transition-all duration-300 ease-in-out px-6 md:px-8",
                                                    isOpen ? "grid-rows-[1fr] pb-8 opacity-100" : "grid-rows-[0fr] opacity-0"
                                                )}>
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
                                <p className="text-muted-foreground">{m.faq_we_couldnt_find()} &quot;{searchQuery}&quot;</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* FAQ CTA - Reimagined */}
                <section className="py-24 bg-foreground text-background">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">{m.faq_still_need_help()}</h2>
                                <p className="text-background/60 text-lg max-w-md">
                                    {m.faq_specialist_support_desc()}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4 shrink-0">
                                <Button size="lg" className="h-16 px-10 rounded-full bg-electric-blue hover:bg-electric-blue/90 text-white font-black text-lg" asChild>
                                    <Link href="/guide">{m.faq_read_member_guide()}</Link>
                                </Button>
                                <Button size="lg" variant="outline" className="h-16 px-10 rounded-full border-background/20 hover:bg-background/10 text-background font-black text-lg" asChild>
                                    <a href={`mailto:${m.faq_email_support_addr()}`}>{m.faq_email_support()}</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

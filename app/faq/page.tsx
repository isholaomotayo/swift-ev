"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, ChevronUp, Plus, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FAQQuestion {
    q: string;
    a: string;
}

interface FAQCategory {
    id: string;
    title: string;
    questions: FAQQuestion[];
}

// FAQ data from the requirements doc
const faqCategories: FAQCategory[] = [
    {
        id: "general",
        title: "General",
        questions: [
            {
                q: "What is Auto Auctions Africa?",
                a: "Auto Auctions Africa is a competitive vehicle auction platform that allows buyers to bid transparently on quality vehicles sourced primarily from China, Japan, Germany, and the USA. Unlike traditional marketplaces with fixed prices, we create a competitive auction environment where buyers compete in real-time for vehicles."
            },
            {
                q: "Is this a marketplace or an auction?",
                a: "It is an auction ecosystem, not a classifieds marketplace. Buyers compete against each other, and vehicles sell to the highest bidder. This creates fair market pricing and gives buyers the opportunity to win vehicles below retail value."
            },
            {
                q: "What types of vehicles are available?",
                a: "We offer Japanese vehicles (Toyota, Honda, Nissan), German vehicles (BMW, Mercedes, Volkswagen), American vehicles (Ford, Chevrolet), Chinese vehicles (BYD, Geely), vehicles, hybrids, and traditional fuel vehicles. Conditions range from like-new to salvage."
            },
            {
                q: "Where are the vehicles located?",
                a: "Vehicles are sourced from China (primary source), Japan, Germany, USA, and Nigeria (local listings). Each listing clearly shows the vehicle's current location."
            },
        ],
    },
    {
        id: "buyers",
        title: "Buyers",
        questions: [
            {
                q: "Do I need to register to browse vehicles?",
                a: "No. You can browse all listings, view auction schedules, and research vehicles without an account. Registration is only required when you want to place bids."
            },
            {
                q: "How do I register as a buyer?",
                a: "1. Click 'Start Bidding' or 'Register'\n2. Select your account type (Individual, Dealer, Corporate)\n3. Complete your profile information\n4. Verify your phone via OTP\n5. Pay the one-time $3 verification fee\n6. Complete KYC by uploading your ID\n7. Fund your wallet to start bidding"
            },
            {
                q: "What is the bidding deposit requirement?",
                a: "Your wallet balance must be at least 10% of any vehicle's value that you wish to bid on. This ensures only serious bidders participate. For example, to bid on a ₦20,000,000 vehicle, you need at least ₦2,000,000 in your wallet."
            },
            {
                q: "Can I withdraw a bid once placed?",
                a: "No. All bids are binding and cannot be withdrawn. When you place a bid, you're making a commitment to purchase the vehicle if you win. Please bid carefully."
            },
            {
                q: "How does the 60-second rule work?",
                a: "During live auctions, each new bid resets a 60-second countdown timer. The auction continues as long as bids keep coming within each 60-second window. The auction only ends when 60 seconds passes with no new bids. This prevents 'sniping' and ensures fair competition."
            },
            {
                q: "What is a Max Bid (Proxy Bidding)?",
                a: "A Max Bid allows you to set the maximum amount you're willing to pay. Our system automatically bids on your behalf, always using the minimum increment needed to stay ahead of other bidders. It never exceeds your maximum."
            },
            {
                q: "What happens after I win an auction?",
                a: "1. You receive instant notification of your win\n2. An invoice is generated with full breakdown\n3. You have 72 hours to complete payment\n4. Select any additional services (shipping, clearing, etc.)\n5. Track your vehicle through delivery"
            },
            {
                q: "What if I can't pay within 72 hours?",
                a: "Late payment results in: ₦50,000 late fee + 2% of invoice total, daily storage fees (₦10,000/day), account suspension risk, and deposit forfeiture in case of non-payment."
            },
        ],
    },
    {
        id: "sellers",
        title: "Sellers",
        questions: [
            {
                q: "How do I list a vehicle for sale?",
                a: "1. Register as a seller\n2. Complete business verification (for dealers)\n3. Click 'Add Vehicle' in your dashboard\n4. Enter all vehicle details\n5. Upload required photos and videos\n6. Upload ownership documents\n7. Choose selling method and set pricing\n8. Submit for review"
            },
            {
                q: "Can I set a Buy Now price?",
                a: "Yes. You can set a fixed 'Buy Now' price for immediate purchase. However, if the vehicle isn't sold before its scheduled auction date, it automatically enters live bidding where the final price is determined by competition."
            },
            {
                q: "What is a reserve price?",
                a: "A reserve price is the minimum amount you're willing to accept. If bidding doesn't reach your reserve, you can choose to accept the highest bid, reject it, or make a counter-offer to the highest bidder."
            },
            {
                q: "How do I get paid after a sale?",
                a: "1. Buyer completes payment into escrow\n2. You receive notification to release the vehicle\n3. Buyer or logistics collects the vehicle\n4. You confirm release in your dashboard\n5. Escrow releases funds to your bank account\n6. Payout arrives within 24-48 hours"
            },
            {
                q: "What fees do sellers pay?",
                a: "Listing fee: Free (promotional) or ₦10,000 standard. Success fee: 6-8% of final sale price (only if sold). Featured listing: ₦25,000 (optional)."
            },
        ],
    },
    {
        id: "payments",
        title: "Payments & Security",
        questions: [
            {
                q: "Is there escrow protection?",
                a: "Yes. All payments are held in escrow by our trusted local partner (Flutterwave). Funds are only released to sellers after the buyer confirms vehicle collection or delivery. This protects both parties."
            },
            {
                q: "What payment methods are accepted?",
                a: "Bank transfer, card payment (Visa, Mastercard, Verve), wallet balance, and USSD. You can also split payments between wallet and other methods."
            },
            {
                q: "Is my personal information secure?",
                a: "Yes. We use industry-standard encryption and security measures. Your payment information is processed through secure, PCI-compliant payment partners. Personal data is protected under our Privacy Policy."
            },
        ],
    },
    {
        id: "shipping",
        title: "Shipping & Clearing",
        questions: [
            {
                q: "How long does shipping take from China to Nigeria?",
                a: "Typical shipping times: Container shipping: 35-45 days, RoRo shipping: 30-40 days. Times may vary based on vessel schedules and conditions."
            },
            {
                q: "What is included in the clearing service?",
                a: "Our clearing service covers: Port documentation processing, SONCAP certification, duty assessment and payment, customs inspection coordination, vehicle release processing, and status updates throughout."
            },
            {
                q: "Can I use my own clearing agent?",
                a: "Yes. You can choose to handle clearing yourself or use your own trusted agent. Simply select 'Buyer Pickup' after port arrival and handle clearing independently."
            },
        ],
    },
    {
        id: "disputes",
        title: "Disputes & Issues",
        questions: [
            {
                q: "How do I report a problem with my purchase?",
                a: "1. Go to your order in the dashboard\n2. Click 'Report Issue'\n3. Select issue type\n4. Upload evidence (photos, videos, documents)\n5. Submit for review\n6. Track resolution status"
            },
            {
                q: "What issues can I dispute?",
                a: "Vehicle not as described, missing documents, seller failed to release vehicle, shipping damage, delivery delays, and other transaction issues."
            },
            {
                q: "How long do I have to report an issue?",
                a: "Vehicle condition issues: 24-72 hours after delivery. Document issues: Within 7 days. Non-delivery: Immediately upon notice. Report issues as soon as you discover them."
            },
            {
                q: "What are possible dispute outcomes?",
                a: "Full refund, partial refund, repair credit, or claim rejection (with explanation). All decisions are based on evidence and platform policies."
            },
        ],
    },
];

export default function FAQPage() {
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
        <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-electric-blue/30">
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
                            Support Center
                        </Badge>
                        <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-8">
                            Knowledge <span className="text-gradient">Database</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                            Find answers to common questions about buying, selling, and managing your vehicle imports.
                        </p>

                        {/* Search Bar - Sophisticated */}
                        <div className="max-w-2xl mx-auto relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-electric-blue transition-colors" />
                            <Input
                                type="text"
                                placeholder="Search our knowledge base..."
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
                            All Categories
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
                                <h3 className="text-xl font-bold mb-2">No results found</h3>
                                <p className="text-muted-foreground">We couldn't find any questions matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* FAQ CTA - Reimagined */}
                <section className="py-24 bg-foreground text-background">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Still need help?</h2>
                                <p className="text-background/60 text-lg max-w-md">
                                    Our specialist support team is available 24/7 to assist with your auction concerns.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4 shrink-0">
                                <Button size="lg" className="h-16 px-10 rounded-full bg-electric-blue hover:bg-electric-blue/90 text-white font-black text-lg" asChild>
                                    <Link href="/guide">Read Member Guide</Link>
                                </Button>
                                <Button size="lg" variant="outline" className="h-16 px-10 rounded-full border-background/20 hover:bg-background/10 text-background font-black text-lg" asChild>
                                    <a href="mailto:support@autoauctionsafrica.com">Email Support</a>
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

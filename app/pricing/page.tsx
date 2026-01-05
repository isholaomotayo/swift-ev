"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, TrendingUp, Building2, Calculator, Info, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ServiceFeeCalculator } from "@/components/pricing/service-fee-calculator";

const tiers = [
  {
    name: "Guest",
    price: 0,
    priceLabel: "Free",
    description: "Browse vehicles only",
    features: [
      "Browse all vehicles",
      "View vehicle details",
      "Read condition reports",
    ],
    dailyBids: 0,
    buyingPower: "₦0",
    icon: <Zap className="h-6 w-6" />,
    popular: false,
    color: "bg-muted"
  },
  {
    name: "Basic",
    price: 75000,
    priceLabel: "₦75,000",
    description: "Perfect for occasional buyers",
    features: [
      "Everything in Guest",
      "3 bids per day",
      "₦5M buying power",
      "Email support",
      "Watchlist (up to 10 vehicles)",
    ],
    dailyBids: 3,
    buyingPower: "₦5M",
    icon: <Zap className="h-6 w-6" />,
    popular: true,
    color: "bg-electric-blue/10"
  },
  {
    name: "Premier",
    price: 150000,
    priceLabel: "₦150,000",
    description: "For serious buyers",
    features: [
      "Everything in Basic",
      "10 bids per day",
      "₦50M buying power",
      "Priority support",
      "Dedicated account manager",
      "Unlimited watchlist",
      "Early access to new listings",
    ],
    dailyBids: 10,
    buyingPower: "₦50M",
    icon: <TrendingUp className="h-6 w-6" />,
    popular: false,
    color: "bg-volt-green/10"
  },
  {
    name: "Business",
    price: 500000,
    priceLabel: "₦500,000",
    description: "For dealers and fleet operators",
    features: [
      "Everything in Premier",
      "Unlimited bids",
      "Unlimited buying power",
      "API access",
      "Bulk shipping discounts",
      "Custom payment terms",
      "Dedicated support team",
    ],
    dailyBids: "Unlimited",
    buyingPower: "Unlimited",
    icon: <Building2 className="h-6 w-6" />,
    popular: false,
    color: "bg-primary/10"
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors selection:bg-electric-blue/30">
      <Header />
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 overflow-hidden border-b border-border">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-electric-blue/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-volt-green/5 rounded-full blur-[120px]" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-8 px-4 py-1.5 rounded-full bg-primary/5 text-primary border-primary/10 backdrop-blur-md uppercase tracking-widest font-bold text-[10px]">
                Membership Plans
              </Badge>
              <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05]">
                Your Gateway <br />
                <span className="text-gradient">to Premium Cars</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Choose the annual membership tier that fits your bidding strategy.
                Unlock lower fees, higher buying power, and direct access to global auctions.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING GRID */}
        <section className="py-32 bg-muted/20 relative">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`group flex flex-col p-8 rounded-[2.5rem] bg-card border border-border transition-all hover-lift relative overflow-hidden ${tier.popular ? "ring-2 ring-electric-blue ring-offset-4 ring-offset-background" : ""
                    }`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0 p-4">
                      <Badge className="bg-electric-blue text-white border-0 font-black tracking-widest text-[10px] px-3">POPULAR</Badge>
                    </div>
                  )}

                  <div className="mb-10">
                    <div className={`w-14 h-14 rounded-2xl ${tier.color} flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform`}>
                      {tier.icon}
                    </div>
                    <h3 className="text-2xl font-black mb-2">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-black">{tier.priceLabel}</span>
                      {tier.price > 0 && <span className="text-muted-foreground text-sm font-bold">/year</span>}
                    </div>
                    <p className="text-muted-foreground text-xs font-medium">{tier.description}</p>
                  </div>

                  <div className="space-y-4 mb-10 py-6 border-y border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider">Daily Bids</span>
                      <span className="font-black text-foreground">{tier.dailyBids}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider">Buying Power</span>
                      <span className="font-black text-foreground">{tier.buyingPower}</span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-12 flex-1">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-volt-green/20 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-volt-green" strokeWidth={4} />
                        </div>
                        <span className="text-muted-foreground font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`h-14 rounded-2xl font-black tracking-tight text-lg shadow-xl transition-all ${tier.popular
                      ? "bg-electric-blue hover:bg-electric-blue-dark text-white shadow-electric-blue/20"
                      : "bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 shadow-none"
                      }`}
                    asChild
                  >
                    <Link href={tier.name === "Guest" ? "/vehicles" : "/register"}>
                      {tier.name === "Guest" ? "Browse Marketplace" : "Choose Plan"}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICE FEE CALCULATOR SECTION */}
        <section className="py-32 border-y border-border relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-electric-blue/5 blur-[120px] -z-10" />
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-16 items-center">
                <div className="w-full md:w-1/2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-widest text-primary mb-6">
                    <Calculator className="h-3 w-3" /> Cost Transparency
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">No hidden fees, <br /> Just clear numbers.</h2>
                  <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                    Our platform ensures complete visibility into landed costs.
                    Use this calculator to estimate total charges including import duty and logistics.
                  </p>
                  <div className="p-6 rounded-3xl bg-muted/30 border border-border">
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 p-2 rounded-xl text-primary mt-1">
                        <Info className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium italic">
                        "Initial estimates may vary slightly based on final port of entry and current exchange rates."
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/2">
                  <div className="glass-morphism rounded-[2.5rem] p-4 border-primary/10">
                    <ServiceFeeCalculator />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ADDITIONAL FEES GRID */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-20 max-w-2xl mx-auto">
              <span className="text-sm font-black tracking-[0.3em] uppercase text-primary block mb-4">Variable Costs</span>
              <h2 className="text-4xl font-black mb-6">Service Transparency</h2>
              <p className="text-muted-foreground font-medium">Clear breakdown of operational costs for every vehicle imported through Auto Auctions Africa.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: "Buyer's Premium", price: "5%", desc: "Standard service fee on winning bids." },
                { title: "Security Deposit", price: "10%", desc: "Refundable deposit required to bid." },
                { title: "Documentation", price: "₦50,000", desc: "Complete import paperwork & filing." },
                { title: "Storage Fee", price: "₦10,000", desc: "Daily fee after free grace period." }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-[2.5rem] bg-card border border-border group hover:border-primary/30 transition-all text-center">
                  <h3 className="font-black text-muted-foreground/50 text-xs uppercase tracking-[0.2em] mb-4">{f.title}</h3>
                  <div className="text-3xl font-black mb-4">{f.price}</div>
                  <p className="text-muted-foreground text-sm font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL REDESIGNED CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-6xl mx-auto rounded-[3.5rem] bg-slate-900 p-12 md:p-24 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
              <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-volt-green/10 blur-[150px] rounded-full transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />

              <div className="relative z-10">
                <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[1.1]">Ready to bid on <br />your first car?</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Button size="lg" variant="secondary" className="h-16 px-12 text-lg rounded-full font-black hover:scale-105 transition-transform" asChild>
                    <Link href="/register">Create Account</Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="h-16 px-12 text-lg rounded-full border border-white/10 hover:bg-white/5 font-black" asChild>
                    <Link href="/vehicles">View Live Auctions <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

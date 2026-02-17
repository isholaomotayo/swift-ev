"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, TrendingUp, Building2, Calculator, Info, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ServiceFeeCalculator } from "@/components/pricing/service-fee-calculator";
import * as m from "@/src/paraglide/messages.js";

export default function PricingPage() {
  const tiers = [
    {
      name: m.pricing_tier_guest(),
      price: 0,
      priceLabel: m.nav_000() ? m.nav_000() : "Free",
      description: m.pricing_desc_browse_only(),
      features: [
        m.pricing_feature_browse_all(),
        m.pricing_feature_view_details(),
        m.pricing_feature_read_reports(),
      ],
      dailyBids: 0,
      buyingPower: "₦0",
      icon: <Zap className="h-6 w-6" />,
      popular: false,
      color: "bg-muted"
    },
    {
      name: m.pricing_tier_basic(),
      price: 75000,
      priceLabel: "₦75,000",
      description: m.pricing_desc_occasional_buyers(),
      features: [
        m.pricing_feature_everything_in_guest(),
        m.common_3_bids_per_day(),
        m.common_5m_buying_power(),
        m.pricing_feature_email_support(),
        m.common_watchlist_up_to_10_vehicles(),
      ],
      dailyBids: 3,
      buyingPower: "₦5M",
      icon: <Zap className="h-6 w-6" />,
      popular: true,
      color: "bg-electric-blue/10"
    },
    {
      name: m.pricing_tier_premier(),
      price: 150000,
      priceLabel: "₦150,000",
      description: m.pricing_desc_serious_buyers(),
      features: [
        m.pricing_feature_everything_in_basic(),
        m.pricing_feature_10_bids(),
        m.common_50m_buying_power(),
        m.pricing_feature_priority_support(),
        m.pricing_feature_dedicated_manager(),
        m.pricing_feature_unlimited_watchlist(),
        m.pricing_feature_early_access(),
      ],
      dailyBids: 10,
      buyingPower: "₦50M",
      icon: <TrendingUp className="h-6 w-6" />,
      popular: false,
      color: "bg-volt-green/10"
    },
    {
      name: m.pricing_tier_business(),
      price: 500000,
      priceLabel: "₦500,000",
      description: m.pricing_desc_dealers(),
      features: [
        m.pricing_feature_everything_in_premier(),
        m.common_unlimited_bids(),
        m.common_unlimited_buying_power(),
        m.common_api_access(),
        m.common_bulk_shipping_discounts(),
        m.common_custom_payment_terms(),
        m.common_dedicated_support_team(),
      ],
      dailyBids: m.common_unlimited_bids(),
      buyingPower: m.common_unlimited_buying_power(),
      icon: <Building2 className="h-6 w-6" />,
      popular: false,
      color: "bg-primary/10"
    },
  ];

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
                {m.pricing_membership_plans()}
              </Badge>
              <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05]">
                {m.pricing_your_gateway()} <br />
                <span className="text-gradient">{m.pricing_to_premium_cars()}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {m.pricing_headline()}
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
                      <Badge className="bg-electric-blue text-white border-0 font-black tracking-widest text-[10px] px-3">{m.pricing_popular()}</Badge>
                    </div>
                  )}

                  <div className="mb-10">
                    <div className={`w-14 h-14 rounded-2xl ${tier.color} flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform`}>
                      {tier.icon}
                    </div>
                    <h3 className="text-2xl font-black mb-2">{tier.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-black">{tier.priceLabel}</span>
                      {tier.price > 0 && <span className="text-muted-foreground text-sm font-bold">{m.pricing_per_year()}</span>}
                    </div>
                    <p className="text-muted-foreground text-xs font-medium">{tier.description}</p>
                  </div>

                  <div className="space-y-4 mb-10 py-6 border-y border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider">{m.pricing_daily_bids()}</span>
                      <span className="font-black text-foreground">{tier.dailyBids}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-bold uppercase tracking-wider">{m.pricing_buying_power()}</span>
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
                    <Link href={tier.name === m.pricing_tier_guest() ? "/vehicles" : "/register"}>
                      {tier.name === m.pricing_tier_guest() ? m.pricing_browse_marketplace() : m.pricing_choose_plan()}
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
                    <Calculator className="h-3 w-3" /> {m.pricing_cost_transparency()}
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">{m.pricing_no_hidden_fees()}</h2>
                  <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                    {m.pricing_transparency_desc()}
                  </p>
                  <div className="p-6 rounded-3xl bg-muted/30 border border-border">
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 p-2 rounded-xl text-primary mt-1">
                        <Info className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium italic">
                        "{m.pricing_estimate_warning()}"
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
              <span className="text-sm font-black tracking-[0.3em] uppercase text-primary block mb-4">{m.pricing_variable_costs()}</span>
              <h2 className="text-4xl font-black mb-6">{m.pricing_service_transparency()}</h2>
              <p className="text-muted-foreground font-medium">{m.pricing_service_transparency_desc()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: m.common_buyer_premium ? m.common_buyer_premium() : "Buyer's Premium", price: "5%", desc: m.common_standard_service_fee_on_winning_bids() },
                { title: m.common_security_deposit ? m.common_security_deposit() : "Security Deposit", price: "10%", desc: m.common_refundable_deposit_required_to_bid ? m.common_refundable_deposit_required_to_bid() : "Refundable deposit required to bid." },
                { title: m.common_documentation_fee ? m.common_documentation_fee() : "Documentation", price: "₦50,000", desc: m.common_complete_import_paperwork_filing ? m.common_complete_import_paperwork_filing() : "Complete import paperwork & filing." },
                { title: m.common_storage_fee ? m.common_storage_fee() : "Storage Fee", price: "₦10,000", desc: m.common_daily_fee_after_free_grace_period() }
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
                <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[1.1]">{m.pricing_ready_to_bid()}</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Button size="lg" variant="secondary" className="h-16 px-12 text-lg rounded-full font-black hover:scale-105 transition-transform" asChild>
                    <Link href="/register">{m.pricing_create_account()}</Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="h-16 px-12 text-lg rounded-full border border-white/10 hover:bg-white/5 font-black" asChild>
                    <Link href="/vehicles">{m.pricing_view_live_auctions()} <ArrowRight className="ml-2 h-5 w-5" /></Link>
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

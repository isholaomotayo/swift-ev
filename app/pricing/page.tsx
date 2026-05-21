"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, TrendingUp, Building2, Gavel, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ServiceFeeCalculator } from "@/components/pricing/service-fee-calculator";
import * as m from "@/src/paraglide/messages.js";

export default function PricingPage() {
  const tiers = [
    {
      name: m.pricing_tier_guest(),
      price: 0,
      priceLabel: "Free",
      description: m.pricing_desc_browse_only(),
      features: [
        m.pricing_feature_browse_all(),
        m.pricing_feature_view_details(),
        m.pricing_feature_read_reports(),
      ],
      dailyBids: 0,
      buyingPower: m.common_0(),
      icon: <Zap className="h-6 w-6" />,
      popular: false,
      color: "bg-muted"
    },
    {
      name: m.pricing_tier_basic(),
      price: 75000,
      priceLabel: m.common_75000 ? m.common_75000() : "₦75,000",
      description: m.pricing_desc_occasional_buyers(),
      features: [
        m.pricing_feature_everything_in_guest(),
        m.common_3_bids_per_day(),
        m.common_5m_buying_power ? m.common_5m_buying_power() : m.common_5m(),
        m.pricing_feature_email_support(),
        m.common_watchlist_up_to_10_vehicles(),
      ],
      dailyBids: 3,
      buyingPower: m.common_5m(),
      icon: <Zap className="h-6 w-6" />,
      popular: true,
      color: "bg-electric-blue/10"
    },
    {
      name: m.pricing_tier_premier(),
      price: 150000,
      priceLabel: m.common_150000 ? m.common_150000() : "₦150,000",
      description: m.pricing_desc_serious_buyers(),
      features: [
        m.pricing_feature_everything_in_basic(),
        m.pricing_feature_10_bids(),
        m.common_50m_buying_power ? m.common_50m_buying_power() : m.common_50m(),
        m.pricing_feature_priority_support(),
        m.pricing_feature_dedicated_manager(),
        m.pricing_feature_unlimited_watchlist(),
        m.pricing_feature_early_access(),
      ],
      dailyBids: 10,
      buyingPower: m.common_50m(),
      icon: <TrendingUp className="h-6 w-6" />,
      popular: false,
      color: "bg-volt-green/10"
    },
    {
      name: m.pricing_tier_business(),
      price: 500000,
      priceLabel: m.common_500000 ? m.common_500000() : "₦500,000",
      description: m.pricing_desc_dealers(),
      features: [
        m.pricing_feature_everything_in_premier(),
        m.pricing_feature_unlimited_daily_bids(),
        m.common_api_access(),
        m.common_bulk_shipping_discounts(),
        m.common_custom_payment_terms(),
        m.common_dedicated_support_team(),
      ],
      dailyBids: m.pricing_feature_unlimited_daily_bids(),
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
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="outline" className="mb-6 px-4 py-1 border-electric-blue/30 text-electric-blue font-bold tracking-wider uppercase text-[10px]">
                {m.pricing_membership_plans()}
              </Badge>
              <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tight leading-[0.95]">
                {m.pricing_membership_plans()}
              </h1>
              <p className="text-xl text-muted-foreground font-medium leading-relaxed mb-12 max-w-2xl mx-auto">
                {m.pricing_headline()}
              </p>
            </div>
          </div>
        </section>

        {/* TIERS GRID */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative flex flex-col p-10 bg-card border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
                    tier.popular ? "border-electric-blue scale-105 z-10 shadow-xl" : "border-border hover:border-electric-blue/30"
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-electric-blue text-white px-6 py-1 text-[10px] font-black uppercase tracking-widest">
                      {m.pricing_popular()}
                    </div>
                  )}

                  <div className={`w-14 h-14 ${tier.color} flex items-center justify-center mb-8 rounded-xl`}>
                    {tier.icon}
                  </div>

                  <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tight">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black">{tier.priceLabel}</span>
                    <span className="text-sm text-muted-foreground font-bold">{tier.price === 0 ? "" : m.pricing_per_year()}</span>
                  </div>

                  <p className="text-muted-foreground text-sm font-medium mb-8 min-h-[40px]">
                    {tier.description}
                  </p>

                  <div className="mb-8 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Gavel className="h-4 w-4 text-electric-blue" />
                      <div className="text-xs font-bold uppercase tracking-wider">
                        {tier.name === m.pricing_tier_business()
                          ? tier.dailyBids
                          : `${tier.dailyBids} ${m.pricing_daily_bids()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-volt-green" />
                      <div className="text-xs font-bold uppercase tracking-wider">
                        {tier.name === m.pricing_tier_business()
                          ? tier.buyingPower
                          : `${tier.buyingPower} ${m.pricing_buying_power()}`}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-10 flex-1">
                    {tier.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-volt-green shrink-0 mt-0.5" />
                        <span className="text-sm font-medium leading-tight">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`h-14 font-black uppercase tracking-widest rounded-none ${
                      tier.popular ? "bg-electric-blue hover:bg-electric-blue/90" : "bg-primary"
                    }`}
                    asChild
                  >
                    <Link href="/register">{m.pricing_choose_plan()}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEED CALCULATOR */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                <div>
                  <Badge className="mb-6 px-4 py-1 bg-volt-green/10 text-volt-green border-none font-black text-[10px] uppercase tracking-widest">
                    Calculator
                  </Badge>
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-8 leading-[0.9]">
                    {m.pricing_no_hidden_fees()}
                  </h2>
                  <p className="text-lg text-muted-foreground font-medium leading-relaxed mb-10">
                    {m.pricing_transparency_desc()}
                  </p>
                  <div className="space-y-6">
                    {[
                      { title: m.common_buyer_premium ? m.common_buyer_premium() : "Buyer's Premium", price: "5%", desc: m.common_standard_service_fee_on_winning_bids() },
                      { title: m.common_security_deposit ? m.common_security_deposit() : "Security Deposit", price: "10%", desc: m.common_refundable_deposit_required_to_bid ? m.common_refundable_deposit_required_to_bid() : "Refundable deposit required to bid." },
                      { title: m.common_documentation_fee ? m.common_documentation_fee() : "Documentation", price: m.common_50000_2 ? m.common_50000_2() : "₦50,000", desc: m.common_complete_import_paperwork_filing ? m.common_complete_import_paperwork_filing() : "Complete import paperwork & filing." },
                      { title: m.common_storage_fee ? m.common_storage_fee() : "Storage Fee", price: m.common_10000 ? m.common_10000() : "₦10,000", desc: m.common_daily_fee_after_free_grace_period() }
                    ].map((f, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="h-10 w-10 shrink-0 bg-muted flex items-center justify-center rounded-lg group-hover:bg-primary/5 transition-colors">
                          <Check className="h-5 w-5 text-primary/30" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-black uppercase text-xs tracking-widest">{f.title}</span>
                            <span className="text-xs font-black text-volt-green bg-volt-green/5 px-2 py-0.5 rounded">{f.price}</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border-4 border-primary shadow-[20px_20px_0px_0px_rgba(var(--primary),0.05)] p-2">
                  <ServiceFeeCalculator />
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

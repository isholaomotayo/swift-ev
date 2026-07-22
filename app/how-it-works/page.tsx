"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Gavel,
  Package,
  CheckCircle2,
  Shield,
  Globe,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import * as m from "@/src/paraglide/messages.js";

export default function HowItWorksPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const steps = [
    {
      number: "01",
      title: m.how_it_works_browse_inventory(),
      description: m.how_it_works_browse_inventory_desc(),
      icon: Search,
      color: "bg-brand-blue text-white",
    },
    {
      number: "02",
      title: m.how_it_works_bid_win(),
      description: m.how_it_works_bid_win_desc(),
      icon: Gavel,
      color: "bg-brand-accent text-white",
    },
    {
      number: "03",
      title: m.how_it_works_managed_logistics(),
      description: m.how_it_works_managed_logistics_desc(),
      icon: Package,
      color: "bg-brand-gold text-brand-primary",
    },
    {
      number: "04",
      title: m.how_it_works_direct_handover(),
      description: m.how_it_works_direct_handover_desc(),
      icon: CheckCircle2,
      color: "bg-brand-success text-white",
    },
  ];

  const faqs = [
    {
      question: m.how_it_works_faqs_q1(),
      answer: m.how_it_works_faqs_a1(),
    },
    {
      question: m.how_it_works_faqs_q2(),
      answer: m.how_it_works_faqs_a2(),
    },
    {
      question: m.how_it_works_faqs_q3(),
      answer: m.how_it_works_faqs_a3(),
    },
    {
      question: m.how_it_works_faqs_q4(),
      answer: m.how_it_works_faqs_a4(),
    },
    {
      question: m.how_it_works_faqs_q5(),
      answer: m.how_it_works_faqs_a5(),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-brand-primary selection:bg-brand-gold/30">
      <Header />
      <main className="flex-1">
        {/* HERO SECTION - SOLID & BOLD */}
        <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-brand-primary text-white overflow-hidden">
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-8 px-5 py-2 rounded-md bg-brand-gold text-brand-primary border-none uppercase tracking-[0.3em] font-black text-[10px]">
                {m.how_it_works_standard()}
              </Badge>
              <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[0.9]">
                <span className="italic">{m.how_it_works_pure_logistics()}</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                {m.how_it_works_eliminated_friction({ siteName: SITE_NAME })}
              </p>
            </div>
          </div>
        </section>

        {/* STEP-BY-STEP GRID */}
        <section className="py-24 border-b border-slate-200 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className="group relative p-10 bg-slate-50 border border-slate-200 hover:bg-white hover:border-brand-primary hover:shadow-2xl transition-all duration-500 rounded-none"
                  >
                    <div
                      className={`w-14 h-14 ${step.color} flex items-center justify-center mb-10 shadow-lg group-hover:-rotate-6 transition-transform`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-xs font-black text-slate-300 mb-2 tracking-[0.5em] uppercase">
                      {step.number} — {m.how_it_works_phase()}
                    </div>
                    <h3 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">
                      {step.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-medium">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TIMELINE SECTION - HIGH CONTRAST */}
        <section className="py-32 bg-brand-primary text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
                <div>
                  <span className="text-brand-gold font-black tracking-[0.3em] uppercase text-xs block mb-6">
                    {m.how_it_works_milestones()}
                  </span>
                  <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight italic uppercase">
                    {m.how_it_works_from_port_to_driveway()}
                  </h2>
                  <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-md">
                    {m.how_it_works_manage_invisible_bureaucracy()}
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: m.common_direct_sourcing(),
                      val: m.how_it_works_verified_auction_tier_1 ? m.how_it_works_verified_auction_tier_1() : "Verified Auction Tier 1",
                    },
                    { title: m.common_ocean_freight(), val: m.how_it_works_maersk_msc_preferred ? m.how_it_works_maersk_msc_preferred() : "Maersk / MSC Preferred" },
                    { title: m.common_customs_clearance_title(), val: m.common_fixedfee_guarantee() },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-6 border border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <span className="font-black uppercase text-xs tracking-widest text-slate-500">
                        {stat.title}
                      </span>
                      <span className="font-bold text-lg text-brand-gold italic">
                        {stat.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {[
                  {
                    title: m.how_it_works_factory_triage(),
                    desc: m.how_it_works_factory_triage_desc(),
                    icon: <Shield className="h-6 w-6" />,
                  },
                  {
                    title: m.how_it_works_escrow_locked(),
                    desc: m.how_it_works_escrow_locked_desc(),
                    icon: <Badge className="h-6 w-6" />,
                  },
                  {
                    title: m.how_it_works_live_gps_track(),
                    desc: m.how_it_works_live_gps_track_desc(),
                    icon: <Globe className="h-6 w-6" />,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-6 p-8 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div className="text-brand-gold">{item.icon}</div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION - BOLD & GROUNDED */}
        <section id="faq" className="py-32 bg-white border-t border-slate-200">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-brand-primary">
                  {m.how_it_works_faq_expert_support()}
                </h2>
              </div>

              <div className="space-y-2">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 overflow-hidden transition-all duration-300"
                    onClick={() =>
                      setActiveFaq(activeFaq === index ? null : index)
                    }
                  >
                    <div
                      className={`p-8 cursor-pointer flex justify-between items-center ${activeFaq === index ? "bg-slate-50" : "bg-white hover:bg-slate-50"}`}
                    >
                      <h3 className="font-black text-lg uppercase tracking-tight text-brand-primary italic">
                        {faq.question}
                      </h3>
                      <div
                        className={`transition-transform duration-500 ${activeFaq === index ? "rotate-180 text-brand-accent" : "text-slate-300"}`}
                      >
                        <Plus className="h-6 w-6" />
                      </div>
                    </div>
                    <div
                      className={`transition-all duration-500 overflow-hidden ${activeFaq === index ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      <div className="p-8 pt-0 bg-slate-50">
                        <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA - SOLID GOLD BACKGROUND */}
        <section className="py-24 bg-brand-gold">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-5xl md:text-7xl font-black mb-10 text-brand-primary italic uppercase tracking-tighter">
              {m.how_it_works_ready_to_win()}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-20 px-12 bg-brand-primary text-white hover:bg-slate-800 rounded-none text-xl font-black uppercase tracking-widest shadow-2xl"
                asChild
              >
                <Link href="/register">{m.register_start_exporting()}</Link>
              </Button>
              <Button
                size="lg"
                className="h-20 px-12 border-4 border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary hover:text-white rounded-none text-xl font-black uppercase tracking-widest transition-all"
                asChild
              >
                <Link href="/vehicles">{m.common_full_inventory()}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

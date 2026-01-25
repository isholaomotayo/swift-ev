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
  ArrowRight,
  Shield,
  Globe,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SITE_NAME } from "@/lib/constants";

const steps = [
  {
    number: "01",
    title: "Browse Inventory",
    description:
      "Access our exclusive global verified database. High-resolution imagery and detailed condition reports for every unit.",
    icon: Search,
    color: "bg-brand-blue text-white",
  },
  {
    number: "02",
    title: "Bid & Win",
    description:
      "Participate in high-stakes live auctions or set your max proxy bid. Our escrow system secures your deposit until the win is confirmed.",
    icon: Gavel,
    color: "bg-brand-accent text-white",
  },
  {
    number: "03",
    title: "Managed Logistics",
    description:
      "We handle everything: ocean freight, port clearing, and local customs documentation. Real-time tracking from port to city.",
    icon: Package,
    color: "bg-brand-gold text-brand-primary",
  },
  {
    number: "04",
    title: "Direct Handover",
    description:
      "Your vehicle is delivered directly to your specified location. Complete documentation and title transfer handled by our team.",
    icon: CheckCircle2,
    color: "bg-brand-success text-white",
  },
];

const faqs = [
  {
    question: "How do I participate in auctions?",
    answer:
      "Simply create an account, browse vehicles, and join live auctions. You can place manual bids or set a maximum bid for automatic proxy bidding.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept payments via multi-currency transfers and secure local gateways. All transactions are backed by our escrow protection system.",
  },
  {
    question: "How long does the export process take?",
    answer:
      "From auction win to final delivery, the process typically takes 35-50 days. This includes inspection window, inland transport, ocean freight, and customs clearance.",
  },
  {
    question: "What documents do I need to provide?",
    answer:
      "We handle the heavy lifting. You only need to provide a valid government ID and proof of address for local registration and title transfer.",
  },
  {
    question: "Is my investment insured?",
    answer:
      "Yes. Every vehicle is fully insured from the moment it leaves the auction floor until the final keys are handed to you.",
  },
];

export default function HowItWorksPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-brand-primary selection:bg-brand-gold/30">
      <Header />
      <main className="flex-1">
        {/* HERO SECTION - SOLID & BOLD */}
        <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-brand-primary text-white overflow-hidden">
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-8 px-5 py-2 rounded-md bg-brand-gold text-brand-primary border-none uppercase tracking-[0.3em] font-black text-[10px]">
                The Export Standard
              </Badge>
              <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[0.9] italic">
                PURE <br />
                <span className="text-brand-gold not-italic uppercase">
                  LOGISTICS.
                </span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                We&apos;ve eliminated the friction of international vehicle
                trade. Full transparency, fixed fees, and legendary reliability
                with {SITE_NAME}.
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
                      {step.number} — Phase
                    </div>
                    <h3 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">
                      {step.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-medium">
                      {step.description}
                    </p>
                    <div className="mt-8 pt-8 border-t border-slate-200 flex items-center text-[10px] font-black uppercase tracking-widest text-brand-primary group-hover:text-brand-accent transition-colors">
                      Detailed Docs <ArrowRight className="ml-2 h-3 w-3" />
                    </div>
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
                    Milestones
                  </span>
                  <h2 className="text-5xl md:text-6xl font-black mb-8 leading-tight italic uppercase">
                    From Port <br />
                    to Driveway
                  </h2>
                  <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-md">
                    We manage the invisible bureaucracy of global trade so you
                    only experience the excitement of the win.
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      title: "Direct Sourcing",
                      val: "Verified Auction Tier 1",
                    },
                    { title: "Ocean Freight", val: "Maersk / MSC Preferred" },
                    { title: "Customs Clearing", val: "Fixed-Fee Guarantee" },
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
                    title: "Factory Triage",
                    desc: "Rigorous 180-point inspection before it even hits the shipping container.",
                    icon: <Shield className="h-6 w-6" />,
                  },
                  {
                    title: "Escrow Locked",
                    desc: "Funds are held in high-security custodial accounts until title verification.",
                    icon: <Badge className="h-6 w-6" />,
                  },
                  {
                    title: "Live GPS Track",
                    desc: "Watch your vehicle cross the Atlantic with real-time satellite updates.",
                    icon: <Globe className="h-6 w-6" />,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-6 p-8 bg-white/5 border border-white/10 rounded-lg"
                  >
                    <div className="text-brand-gold">{item.icon}</div>
                    <h3 className="text-2xl font-black italic uppercase italic leading-none">
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
        <section className="py-32 bg-white border-t border-slate-200">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-brand-primary">
                  FAQ — Expert Support
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
              Ready to win?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-20 px-12 bg-brand-primary text-white hover:bg-slate-800 rounded-none text-xl font-black uppercase tracking-widest shadow-2xl"
                asChild
              >
                <Link href="/register">Start Exporting</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-20 px-12 border-4 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white rounded-none text-xl font-black uppercase tracking-widest transition-all"
                asChild
              >
                <Link href="/vehicles">View Inventory</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

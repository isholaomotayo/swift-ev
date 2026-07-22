"use client";

import { Shield, Lock, AlertTriangle, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SAFETY_EMAIL, SITE_NAME } from "@/lib/constants";
import * as m from "@/src/paraglide/messages.js";

export default function TrustSafetyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-brand-primary">
      <Header />
      <main className="flex-1">
        {/* Hero - REBUILT FOR DEPTH */}
        <section className="bg-brand-primary text-white py-24 md:py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <Badge className="mb-8 px-6 py-2 rounded-none bg-brand-gold text-brand-primary border-none uppercase tracking-[0.4em] font-black text-[10px]">
              {m.trust_safety_protocol()}
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black mb-6 uppercase italic tracking-tighter">
              {m.trust_safety_armor_plated().split(" ")[0]} <span className="text-brand-gold not-italic">{m.trust_safety_armor_plated().split(" ").slice(1).join(" ")}</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
              {m.trust_safety_hero_desc({ siteName: SITE_NAME })}
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-24 max-w-6xl">
          {/* Escrow Protection - SOLID DESIGN */}
          <section className="mb-24">
            <div className="grid lg:grid-cols-[1fr_2fr] gap-12 items-start">
              <div className="bg-white p-12 border-4 border-brand-primary shadow-[12px_12px_0px_0px_rgba(15,23,42,0.1)]">
                <div className="h-16 w-16 bg-brand-success text-white flex items-center justify-center mb-8 shadow-lg">
                  <Lock className="h-8 w-8" />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-6 leading-none">
                  {m.trust_safety_escrow_protected().split(" ")[0]} <br />
                  {m.trust_safety_escrow_protected().split(" ").slice(1).join(" ")}
                </h2>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                  {m.trust_safety_escrow_desc()}
                </p>
                <Button className="w-full h-14 bg-brand-primary text-white font-black uppercase tracking-widest rounded-none">
                  {m.trust_safety_read_policy()}
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    step: "01",
                    title: m.trust_safety_step_1_title(),
                    desc: m.trust_safety_step_1_desc(),
                  },
                  {
                    step: "02",
                    title: m.trust_safety_step_2_title(),
                    desc: m.trust_safety_step_2_desc(),
                  },
                  {
                    step: "03",
                    title: m.trust_safety_step_3_title(),
                    desc: m.trust_safety_step_3_desc(),
                  },
                  {
                    step: "04",
                    title: m.trust_safety_step_4_title(),
                    desc: m.trust_safety_step_4_desc(),
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="bg-white p-8 border border-slate-200 hover:border-brand-primary transition-colors"
                  >
                    <div className="text-brand-gold font-black text-xs tracking-widest uppercase mb-4">
                      {step.step} • {m.trust_safety_milestone()}
                    </div>
                    <h3 className="text-xl font-black uppercase italic mb-3">
                      {step.title}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Fraud Prevention - HIGH CONTRAST */}
          <section className="mb-24 py-24 bg-slate-900 text-white rounded-[2rem] px-12 overflow-hidden relative">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <Badge className="mb-6 px-4 py-1 bg-white/10 text-brand-accent border-none font-black text-[10px] uppercase tracking-widest">
                  {m.trust_safety_counter_fraud()}
                </Badge>
                <h2 className="text-4xl md:text-5xl font-black mb-8 uppercase italic tracking-tighter">
                  {m.trust_safety_anti_corruption().split(" ")[0]} <br />
                  {m.trust_safety_anti_corruption().split(" ").slice(1).join(" ")}
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      title: m.trust_safety_shill_bid(),
                      desc: m.trust_safety_shill_bid_desc(),
                    },
                    {
                      title: m.trust_safety_asset_auth(),
                      desc: m.trust_safety_asset_auth_desc(),
                    },
                    {
                      title: m.trust_safety_verified_id(),
                      desc: m.trust_safety_verified_id_desc(),
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6 group">
                      <div className="mt-1 transition-transform group-hover:scale-110">
                        <AlertTriangle className="h-6 w-6 text-brand-accent" />
                      </div>
                      <div>
                        <h4 className="font-black uppercase text-lg italic tracking-tight mb-1">
                          {item.title}
                        </h4>
                        <p className="text-slate-400 text-sm font-medium">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-10 bg-brand-gold/5 rounded-full blur-3xl" />
                <div className="relative bg-white/5 border border-white/10 p-10 rounded-xl space-y-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-6">
                    <span className="font-black uppercase tracking-widest text-xs text-slate-500">
                      {m.trust_safety_security_pulse()}
                    </span>
                    <span className="flex items-center gap-2 text-brand-success font-black text-xs uppercase tracking-widest">
                      <div className="h-2 w-2 rounded-full bg-brand-success animate-pulse" />{" "}
                      {m.trust_safety_live_protection()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {m.trust_safety_quote()}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Dispute Resolution - SOLID BLOCKS */}
          <section className="mb-24">
            <div className="text-center mb-16">
              <div className="h-12 w-12 bg-brand-primary text-white flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
                {m.trust_safety_arbitration_title()}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  label: m.trust_safety_stat_response_label(),
                  val: m.trust_safety_stat_response_val(),
                  desc: m.trust_safety_stat_response_desc(),
                },
                {
                  label: m.trust_safety_stat_reviewed_label(),
                  val: m.trust_safety_stat_reviewed_val(),
                  desc: m.trust_safety_stat_reviewed_desc(),
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white p-10 border border-slate-200 text-center hover:border-brand-primary transition-all"
                >
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 italic">
                    {stat.label}
                  </div>
                  <div className="text-4xl font-black text-brand-primary mb-2 italic">
                    {stat.val}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {stat.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Support - GROUNDED FINAL SECTION */}
          <section className="py-20 bg-brand-gold text-brand-primary text-center">
            <div className="max-w-2xl mx-auto px-4">
              <div className="h-16 w-16 bg-brand-primary text-white flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
                <HeadphonesIcon className="h-8 w-8" />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">
                {m.trust_safety_immediate_assistance()}
              </h2>
              <p className="text-brand-primary/70 font-bold mb-10 max-w-sm mx-auto uppercase tracking-tighter">
                {m.common_our_trust_safety_team_is_deployed_247_across_three()}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  size="lg"
                  className="h-16 px-10 bg-brand-primary text-white font-black uppercase tracking-widest rounded-none shadow-2xl"
                  asChild
                >
                  <Link href={`mailto:${SAFETY_EMAIL}`}>
                    {m.trust_safety_email_direct()}
                  </Link>
                </Button>
                <Button
                  size="lg"
                  className="h-16 px-10 border-2 border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary hover:text-white font-black uppercase tracking-widest rounded-none transition-all"
                  asChild
                >
                  <Link href="/faq">{m.trust_safety_read_faq()}</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

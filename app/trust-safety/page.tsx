"use client";

import { Shield, Lock, AlertTriangle, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME } from "@/lib/constants";

export default function TrustSafetyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-brand-primary">
      <Header />
      <main className="flex-1">
        {/* Hero - REBUILT FOR DEPTH */}
        <section className="bg-brand-primary text-white py-24 md:py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <Badge className="mb-8 px-6 py-2 rounded-none bg-brand-gold text-brand-primary border-none uppercase tracking-[0.4em] font-black text-[10px]">
              Security Protocol
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black mb-6 uppercase italic tracking-tighter">
              Armor <span className="text-brand-gold not-italic">Plated.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
              Global trade requires absolute trust. We&apos;ve built the
              industry&apos;s most robust verification and escrow infrastructure
              for {SITE_NAME}.
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
                  Escrow <br />
                  Protected.
                </h2>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                  Your capital never touches the seller until the vehicle is
                  inspected and cleared for export.
                </p>
                <Button className="w-full h-14 bg-brand-primary text-white font-black uppercase tracking-widest rounded-none">
                  Read Policy
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    step: "01",
                    title: "Capital Injection",
                    desc: "Funds are locked in a Tier-1 multi-sig custodial account.",
                  },
                  {
                    step: "02",
                    title: "Asset Verification",
                    desc: "Independent 180-point onsite inspection complete.",
                  },
                  {
                    step: "03",
                    title: "Export Transit",
                    desc: "Bill of Lading issued and title transfer initiated.",
                  },
                  {
                    step: "04",
                    title: "Success Release",
                    desc: "Capital released to seller upon terminal arrival.",
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="bg-white p-8 border border-slate-200 hover:border-brand-primary transition-colors"
                  >
                    <div className="text-brand-gold font-black text-xs tracking-widest uppercase mb-4">
                      {step.step} • Milestone
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
                  Counter-Fraud
                </Badge>
                <h2 className="text-4xl md:text-5xl font-black mb-8 uppercase italic tracking-tighter">
                  Anti-Corruption <br />
                  Systems.
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      title: "Shill Bid Monitoring",
                      desc: "AI-driven behavioral analysis prevents artificial inflation.",
                    },
                    {
                      title: "Asset Authentication",
                      desc: "VIN analysis against 12 global databases for accident history.",
                    },
                    {
                      title: "Verified Identity",
                      desc: "Mandatory Tier-2 KYC for all buyers and sellers.",
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
                      Security Pulse
                    </span>
                    <span className="flex items-center gap-2 text-brand-success font-black text-xs uppercase tracking-widest">
                      <div className="h-2 w-2 rounded-full bg-brand-success animate-pulse" />{" "}
                      Live Protection
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[98%] bg-brand-gold" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      System Integrity: 99.98%
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium italic">
                    &quot;Our systems analyze over 4.2 million data points daily
                    to ensure every bid is authentic and every seller is
                    legitimate.&quot;
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
                Arbitration Framework.
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                {
                  label: "Response",
                  val: "24-48H",
                  desc: "Official acknowledgement",
                },
                {
                  label: "Resolution",
                  val: "7 Days",
                  desc: "Average case closing",
                },
                {
                  label: "Amicable",
                  val: "95%",
                  desc: "Bilateral agreement rate",
                },
                { label: "Reviewed", val: "100%", desc: "Human oversight" },
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
                Immediate Assistance.
              </h2>
              <p className="text-brand-primary/70 font-bold mb-10 max-w-sm mx-auto uppercase tracking-tighter">
                Our trust & safety team is deployed 24/7 across three timezones.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  size="lg"
                  className="h-16 px-10 bg-brand-primary text-white font-black uppercase tracking-widest rounded-none shadow-2xl"
                  asChild
                >
                  <Link href="mailto:safety@autoexports.live">
                    E-Mail Direct
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 px-10 border-2 border-brand-primary text-brand-primary font-black uppercase tracking-widest rounded-none hover:bg-brand-primary hover:text-white transition-all"
                  asChild
                >
                  <Link href="/faq">Review Database</Link>
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

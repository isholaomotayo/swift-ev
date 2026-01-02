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
  HelpCircle,
  Zap,
  Shield,
  Truck,
  Globe,
  Plus
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const steps = [
  {
    number: "01",
    title: "Browse Marketplace",
    description:
      "Explore our catalog of quality electric vehicles from Chinese manufacturers. Use filters to find vehicles by battery health, and more.",
    icon: Search,
    color: "bg-electric-blue/10 text-electric-blue"
  },
  {
    number: "02",
    title: "Secure Bidding",
    description:
      "Join live auctions or place proxy bids. Our system protects your interests with transparent real-time bidding mechanisms.",
    icon: Gavel,
    color: "bg-volt-green/10 text-volt-green"
  },
  {
    number: "03",
    title: "Smart Logistics",
    description:
      "We handle documentation, shipping, and customs clearance. Track your vehicle's journey across the world in real-time.",
    icon: Package,
    color: "bg-primary/10 text-primary"
  },
  {
    number: "04",
    title: "Final Delivery",
    description:
      "Receive your EV at your doorstep or specified location. Complete final inspection and start your green journey.",
    icon: CheckCircle2,
    color: "bg-electric-blue/10 text-electric-blue"
  },
];

const faqs = [
  {
    question: "How do I participate in auctions?",
    answer:
      "Simply create an account, browse vehicles, and join live auctions. You can place manual bids or set a maximum bid for automatic proxy bidding."
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept payments via Paystack, which supports bank transfers, debit cards, and mobile money. All payments are secure and encrypted."
  },
  {
    question: "How long does shipping take?",
    answer:
      "Shipping from China to Nigeria typically takes 35-45 days depending on the shipping method (container or RoRo) and port of departure."
  },
  {
    question: "What documents do I need?",
    answer:
      "We handle all import documentation including SONCAP certification, Form M, and customs clearance. You'll need to provide a valid ID and proof of address."
  },
  {
    question: "What if the vehicle has issues?",
    answer:
      "All vehicles come with detailed condition reports and battery health assessments. We provide inspection reports before shipping, and you can review all documentation before bidding."
  },
  {
    question: "What are the import duties for EVs?",
    answer:
      "Electric vehicles enjoy reduced import duties (10-20%) and are exempt from VAT and IAT in many cases. We calculate all costs upfront so you know the total price before bidding."
  }
];

export default function HowItWorksPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-electric-blue/30">
      <Header />
      <main className="flex-1">
        {/* HERO SECTION - IMMERSIVE */}
        <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 overflow-hidden border-b border-border">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-blue/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-volt-green/5 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10 dark:opacity-20 translate-y-20" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-8 px-4 py-1.5 rounded-full bg-primary/5 text-primary border-primary/10 backdrop-blur-md uppercase tracking-widest font-bold text-[10px]">
                The Future of Vehicle Import
              </Badge>
              <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05]">
                Seamless <br />
                <span className="text-gradient">Transparency</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                We've redesigned the path from global manufacturers to your driveway.
                Experience a simplified, secure, and purely digital import process.
              </p>
            </div>
          </div>
        </section>

        {/* STEP-BY-STEP GRID */}
        <section className="py-32 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={idx} className="group relative p-8 rounded-[2.5rem] bg-card border border-border hover-lift transition-all">
                    <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-black text-muted-foreground/30 mb-4 tracking-tighter text-4xl">{step.number}</div>
                    <h3 className="text-2xl font-black mb-4">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    <div className="mt-8 flex items-center text-xs font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more <ArrowRight className="ml-2 h-3 w-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* VERTICAL TIMELINE / DETAILED PROCESS */}
        <section className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-24">
                <span className="text-sm font-black tracking-[0.2em] uppercase text-electric-blue block mb-4">Journey Map</span>
                <h2 className="text-4xl md:text-6xl font-black mb-8">From Port to Home</h2>
                <div className="h-1 w-24 bg-gradient-to-r from-electric-blue to-volt-green mx-auto rounded-full" />
              </div>

              <div className="space-y-12 md:space-y-0 relative">
                {/* Connector Line (Desktop) */}
                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 z-0" />

                {[
                  {
                    title: "Manufacturer Direct",
                    desc: "We source directly from premium production lines in China, ensuring you get factory-quality vehicles with original certifications.",
                    icon: <Globe className="h-6 w-6" />,
                    align: "right"
                  },
                  {
                    title: "Rigorous Inspection",
                    desc: "Every EV undergoes a 150-point inspection, specifically focusing on battery health (SOH) and power electronics.",
                    icon: <Shield className="h-6 w-6" />,
                    align: "left"
                  },
                  {
                    title: "Global Shipping",
                    desc: "Secured RO-RO or Container shipping with real-time GPS tracking. Your investment is fully insured throughout the voyage.",
                    icon: <Truck className="h-6 w-6" />,
                    align: "right"
                  },
                  {
                    title: "Customs Clearing",
                    desc: "Our localized agents handle all Nigerian port formalities, SONCAP certifications, and duty payments seamlessly.",
                    icon: <Package className="h-6 w-6" />,
                    align: "left"
                  },
                  {
                    title: "The Handover",
                    desc: "Direct delivery to your Lagos, Abuja or Port Harcourt address, complete with a local orientation on your new EV.",
                    icon: <Zap className="h-6 w-6" />,
                    align: "right"
                  }
                ].map((item, i) => (
                  <div key={i} className={`relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-24 mb-24 last:mb-0 ${item.align === 'left' ? 'md:flex-row-reverse' : ''}`}>
                    <div className="flex-1 text-center md:text-left">
                      <div className={`flex flex-col ${item.align === 'left' ? 'md:items-end' : 'md:items-start'}`}>
                        <h3 className="text-2xl font-black mb-4">{item.title}</h3>
                        <p className={`text-muted-foreground text-sm max-w-sm leading-relaxed ${item.align === 'left' ? 'md:text-right' : ''}`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-background border-4 border-muted flex items-center justify-center shadow-xl group hover:border-primary transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                    </div>

                    <div className="flex-1 hidden md:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ - ACCORDION STYLE REDESIGNED */}
        <section className="py-32 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/grid-pattern.svg')] opacity-5" />
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-16 items-start">
                <div className="md:sticky md:top-32 w-full md:w-1/3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-volt-green mb-6">
                    <HelpCircle className="h-3 w-3" /> Support
                  </div>
                  <h2 className="text-4xl font-black mb-6">Common <br />Questions</h2>
                  <p className="text-white/50 text-sm leading-relaxed mb-8">
                    Everything you need to know about the transition to electric mobility in Nigeria.
                  </p>
                  <Button variant="outline" className="rounded-full border-white/10 text-white hover:bg-white/5 px-8">
                    Contact Support
                  </Button>
                </div>

                <div className="w-full md:w-2/3 space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className={`p-1 rounded-[2rem] transition-all cursor-pointer ${activeFaq === index ? 'bg-gradient-to-r from-electric-blue to-volt-green shadow-xl shadow-electric-blue/10' : 'bg-white/5 hover:bg-white/10'}`}
                      onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    >
                      <div className="bg-slate-900 rounded-[1.95rem] p-8">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg md:text-xl pr-8">{faq.question}</h3>
                          <div className={`transition-transform duration-300 ${activeFaq === index ? 'rotate-45 text-volt-green' : 'text-white/30'}`}>
                            <Plus className="h-6 w-6" />
                          </div>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${activeFaq === index ? 'max-h-96 mt-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                          <p className="text-white/60 leading-relaxed text-sm">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="glass-morphism rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden border border-primary/10">
              <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full" />
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-6xl font-black mb-8">Ready to start?</h2>
                <p className="text-muted-foreground text-lg mb-12">
                  Create an account today and browse thousands of electric vehicles
                  ready for import to Nigeria.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Button size="lg" className="h-16 px-10 rounded-full bg-electric-blue hover:bg-electric-blue-dark text-white font-bold text-lg shadow-xl shadow-electric-blue/10" asChild>
                    <Link href="/register">Create Account</Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="h-16 px-10 rounded-full border border-border font-bold text-lg" asChild>
                    <Link href="/vehicles">Explore Marketplace</Link>
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

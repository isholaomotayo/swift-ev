import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Globe } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CONTACT_INFO, SITE_NAME } from "@/lib/constants";
import { getAboutContent } from "@/lib/content/about";
import { getLocale } from "@/src/paraglide/runtime.js";
import * as m from "@/src/paraglide/messages.js";

export const metadata: Metadata = {
  title: `About Us | ${SITE_NAME}`,
  description: `Learn how ${SITE_NAME} brings verified Chinese vehicles to Nigerian buyers with escrow, insurance, and end-to-end logistics.`,
};

export default function AboutPage() {
  const content = getAboutContent(getLocale());

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <section className="bg-slate-900 text-white py-20 md:py-28">
          <div className="container mx-auto px-4 max-w-4xl">
            <Badge className="mb-6 px-4 py-1 bg-brand-gold/20 text-brand-gold border-none uppercase tracking-widest font-bold text-[10px]">
              {m.about_badge()}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
              {content.hero.title}
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-3xl">
              {content.hero.description}
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24 border-b border-border">
          <div className="container mx-auto px-4 max-w-4xl space-y-8">
            <h2 className="text-3xl font-black tracking-tight">{content.story.title}</h2>
            <blockquote className="border-l-4 border-brand-gold pl-6 italic text-muted-foreground text-lg leading-relaxed">
              {content.story.quote}
            </blockquote>
            {content.story.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="py-16 md:py-24 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4 max-w-4xl space-y-10">
            <h2 className="text-3xl font-black tracking-tight">{content.discovery.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{content.discovery.intro}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {content.discovery.partners.map((partner) => (
                <div
                  key={partner.name}
                  className="rounded-xl border border-border bg-card p-6 space-y-2"
                >
                  <div className="flex items-center gap-2 text-brand-gold">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {partner.location}
                    </span>
                  </div>
                  <h3 className="font-black text-lg">{partner.name}</h3>
                  <p className="text-sm text-muted-foreground">{partner.description}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground leading-relaxed">{content.discovery.closing}</p>
          </div>
        </section>

        <section className="py-16 md:py-24 border-b border-border">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            <h2 className="text-3xl font-black tracking-tight">{content.whoWeAre.title}</h2>
            {content.whoWeAre.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-muted-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section className="py-16 md:py-24 bg-slate-900 text-white border-b border-white/10">
          <div className="container mx-auto px-4 max-w-4xl space-y-10">
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-4">{content.offerings.title}</h2>
              <p className="text-slate-300 leading-relaxed">{content.offerings.intro}</p>
            </div>
            <ul className="space-y-6">
              {content.offerings.items.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-brand-gold mt-0.5" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-16 md:py-24 border-b border-border">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            <h2 className="text-3xl font-black tracking-tight">{content.mission.title}</h2>
            <blockquote className="text-xl font-medium italic text-foreground leading-relaxed">
              &ldquo;{content.mission.quote}&rdquo;
            </blockquote>
            <p className="text-muted-foreground leading-relaxed">{content.mission.closing}</p>
          </div>
        </section>

        <section className="py-20 bg-brand-gold text-brand-primary">
          <div className="container mx-auto px-4 max-w-4xl text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">{content.cta.title}</h2>
            <p className="text-lg font-medium max-w-2xl mx-auto">{content.cta.description}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-14 px-10 bg-brand-primary text-white font-black uppercase tracking-widest"
                asChild
              >
                <Link href="/vehicles">{m.about_cta_browse_inventory()}</Link>
              </Button>
              <Button
                size="lg"
                className="h-14 px-10 border-2 border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary hover:text-white font-black uppercase tracking-widest transition-all"
                asChild
              >
                <Link href="/register">{m.about_cta_register()}</Link>
              </Button>
            </div>
            <p className="text-sm font-medium opacity-80">
              {CONTACT_INFO.EMAIL} | {CONTACT_INFO.PHONE}
            </p>
            <p className="text-sm font-medium opacity-80">{CONTACT_INFO.ADDRESS}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

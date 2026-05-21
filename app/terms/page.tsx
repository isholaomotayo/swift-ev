import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME, CONTACT_INFO } from "@/lib/constants";
import * as m from "@/src/paraglide/messages.js";

export const metadata = {
  title: `Terms of Service - ${SITE_NAME}`,
  description: `Terms, buyer protections, seller commissions, and account obligations for ${SITE_NAME}.`,
};

const buyerSections = [
  { title: () => m.terms_buyer_obligations_title(), body: () => m.terms_buyer_obligations_body() },
  { title: () => m.terms_escrow_title(), body: () => m.terms_escrow_body() },
  { title: () => m.terms_condition_disputes_title(), body: () => m.terms_condition_disputes_body() },
  { title: () => m.terms_shipping_title(), body: () => m.terms_shipping_body() },
  { title: () => m.terms_refund_title(), body: () => m.terms_refund_body() },
  { title: () => m.terms_non_delivery_title(), body: () => m.terms_non_delivery_body() },
  { title: () => m.terms_governing_law_title(), body: () => m.terms_governing_law_body() },
  { title: () => m.terms_liability_title(), body: () => m.terms_liability_body() },
] as const;

export default function TermsPage() {
  const lastUpdated = "February 2026";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <section className="bg-slate-900 text-white py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-electric-blue/20 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5 text-electric-blue" />
              </div>
              <span className="text-sm font-bold text-white/60 uppercase tracking-widest">Legal</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-white/60 text-lg">Last updated: {lastUpdated}</p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16 max-w-4xl space-y-10">
          <section className="space-y-4 text-muted-foreground">
            <p>
              These Terms govern your use of {SITE_NAME}. By creating an account, placing a bid, or listing
              a vehicle, you agree to these Terms and to our{" "}
              <Link href="/privacy" className="text-electric-blue hover:underline font-medium">
                Privacy Policy
              </Link>.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black">{m.terms_buyer_terms_heading()}</h2>
            <p className="text-muted-foreground">{m.terms_buyer_terms_intro()}</p>
            {buyerSections.map((section) => (
              <div key={section.title().toString()} className="space-y-3">
                <h3 className="text-xl font-black">{section.title()}</h3>
                <p className="text-muted-foreground leading-relaxed">{section.body()}</p>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black">{m.terms_seller_commissions_title()}</h2>
            <div className="p-6 rounded-2xl border border-border bg-card text-muted-foreground space-y-2">
              <p>{m.terms_seller_commissions_intro()}</p>
              <p>{m.terms_seller_commission_tier_1()}</p>
              <p>{m.terms_seller_commission_tier_2()}</p>
              <p>{m.terms_seller_commission_tier_3()}</p>
              <p className="pt-2 text-sm">{m.terms_fee_clarification()}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black">{m.terms_vendor_listing_title()}</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>{m.terms_vendor_listing_1()}</li>
              <li>{m.terms_vendor_listing_2()}</li>
              <li>{m.terms_vendor_listing_3()}</li>
              <li>{m.terms_vendor_listing_4()}</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black">{m.terms_payments_title()}</h2>
            <p className="text-muted-foreground">{m.terms_payments_body()}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black">Contact</h2>
            <p className="text-muted-foreground">
              Questions about these Terms can be sent to{" "}
              <a href={`mailto:${CONTACT_INFO.EMAIL}`} className="text-electric-blue hover:underline font-medium">
                {CONTACT_INFO.EMAIL}
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

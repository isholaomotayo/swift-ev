import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME, CONTACT_INFO } from "@/lib/constants";

export const metadata = {
  title: `Terms of Service - ${SITE_NAME}`,
  description: `Terms, seller commissions, and account obligations for ${SITE_NAME}.`,
};

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
              These Terms govern your use of {SITE_NAME}. By creating an account or listing
              a vehicle, you agree to these Terms and to our{" "}
              <Link href="/privacy" className="text-electric-blue hover:underline font-medium">
                Privacy Policy
              </Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black">Seller Commissions</h2>
            <div className="p-6 rounded-2xl border border-border bg-card text-muted-foreground space-y-2">
              <p>Commission is deducted from successful auction sales only.</p>
              <p>7% for final bids up to N5,000,000.</p>
              <p>6% for final bids above N5,000,000 and up to N15,000,000.</p>
              <p>5% for final bids above N15,000,000.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black">Vendor Listing Requirements</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Vehicle details must be accurate and truthful.</li>
              <li>Required media categories must be uploaded before submission.</li>
              <li>A walkthrough video is required for seller listings.</li>
              <li>Inspection reports may be uploaded to support listing quality.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black">Payments, Fees, and Settings</h2>
            <p className="text-muted-foreground">
              Verification fees, where enabled, are configured by platform administrators and shown
              during registration. Payout details provided by vendors are used for sale disbursement only.
            </p>
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

import Link from "next/link";
import { Shield } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME, CONTACT_INFO } from "@/lib/constants";

export const metadata = {
  title: `Privacy Policy — ${SITE_NAME}`,
  description: `Learn how ${SITE_NAME} collects, uses, and protects your personal data.`,
};

export default function PrivacyPage() {
  const lastUpdated = "February 2026";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-electric-blue/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-electric-blue" />
              </div>
              <span className="text-sm font-bold text-white/60 uppercase tracking-widest">Legal</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-white/60 text-lg">
              Last updated: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="prose prose-slate max-w-none space-y-10">

            {/* Introduction */}
            <section>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {SITE_NAME} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our platform at autoexports.live, including our vehicle auction marketplace,
                buyer and seller portals, and related services (collectively, the &quot;Platform&quot;).
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                By registering or using the Platform, you agree to the practices described in this Policy.
                If you do not agree, please discontinue use of the Platform.
              </p>
            </section>

            <hr className="border-border" />

            {/* 1. Information We Collect */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">1. Information We Collect</h2>

              <h3 className="text-lg font-bold text-foreground mb-2">1.1 Information You Provide</h3>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong>Account Registration:</strong> Full name, email address, phone number, password, and account type (individual buyer, dealer, corporate, or seller).</li>
                <li><strong>KYC / Identity Verification:</strong> Government-issued ID, proof of address, business registration documents, and dealer licenses where applicable.</li>
                <li><strong>Vehicle Listings (Sellers):</strong> Vehicle details, photographs, inspection reports, pricing, and condition information.</li>
                <li><strong>Payout / Bank Details (Vendors):</strong> Bank name, account name, account number, SWIFT/BIC code, and preferred currency. This information is used solely to process auction sale proceeds.</li>
                <li><strong>Communications:</strong> Any messages, dispute submissions, or support requests you send us.</li>
              </ul>

              <h3 className="text-lg font-bold text-foreground mb-2 mt-6">1.2 Information Collected Automatically</h3>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong>Usage Data:</strong> Pages visited, auction activity, bids placed, search queries, and time spent on the Platform.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
                <li><strong>Cookies and Similar Technologies:</strong> We use session cookies to keep you logged in and preference cookies to remember your settings. You can disable cookies in your browser, but some features may not function correctly.</li>
              </ul>
            </section>

            <hr className="border-border" />

            {/* 2. How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">2. How We Use Your Information</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>To create and manage your account and authenticate your identity.</li>
                <li>To process vehicle listings, bids, and auction transactions.</li>
                <li>To verify your identity and comply with Know Your Customer (KYC) and Anti-Money Laundering (AML) obligations.</li>
                <li>To facilitate payments, including the one-time registration verification fee where applicable, and vendor payout disbursements.</li>
                <li>To send transactional notifications (bid confirmations, outbid alerts, auction results, shipment updates).</li>
                <li>To resolve disputes between buyers and sellers.</li>
                <li>To improve the Platform through analytics, A/B testing, and user research.</li>
                <li>To comply with applicable laws, regulations, and lawful government requests.</li>
              </ul>
            </section>

            <hr className="border-border" />

            {/* 3. How We Share Your Information */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">3. How We Share Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell your personal data. We may share information with:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong>Transaction Counterparties:</strong> Buyers receive necessary shipping and contact details from sellers after a successful auction. Sellers receive sufficient buyer information to process the sale.</li>
                <li><strong>Payment Processors:</strong> To facilitate verification fees and payouts, relevant financial data is shared with our payment processing partners under strict data agreements.</li>
                <li><strong>Shipping and Logistics Partners:</strong> Name, contact, and delivery address for order fulfillment.</li>
                <li><strong>KYC / Compliance Providers:</strong> Identity documents shared with third-party verification services to complete the KYC process.</li>
                <li><strong>Legal and Regulatory Authorities:</strong> Where required by law, court order, or to protect the rights and safety of our users and platform.</li>
                <li><strong>Service Providers:</strong> Cloud hosting, database, analytics, and customer support tools — all bound by confidentiality obligations.</li>
              </ul>
            </section>

            <hr className="border-border" />

            {/* 4. Verification Fee & Financial Data */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">4. Verification Fee &amp; Financial Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                To maintain a secure marketplace, we may require a one-time identity verification fee upon registration.
                This fee is processed through a secure, encrypted payment gateway. We do not store full card details on
                our servers. Payment data is handled by our PCI-compliant payment partners. The fee amount and whether
                it is required may be adjusted by platform administrators and will always be disclosed to you before
                payment is requested.
              </p>
            </section>

            <hr className="border-border" />

            {/* 5. Data Retention */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">5. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account is active or as necessary to provide
                our services. KYC documents are retained for a minimum of 5 years in accordance with Nigerian financial
                regulations and applicable AML requirements. You may request deletion of your account and associated
                data, subject to our legal obligations to retain certain records.
              </p>
            </section>

            <hr className="border-border" />

            {/* 6. Your Rights */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your jurisdiction, you may have the following rights regarding your personal data:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Erasure:</strong> Request deletion of your data, subject to legal retention requirements.</li>
                <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                <li><strong>Objection:</strong> Object to processing of your data for certain purposes, including direct marketing.</li>
                <li><strong>Withdrawal of Consent:</strong> Where processing is based on consent, withdraw consent at any time without affecting prior processing.</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise any of these rights, contact us at{" "}
                <a href={`mailto:${CONTACT_INFO.EMAIL}`} className="text-electric-blue hover:underline font-medium">
                  {CONTACT_INFO.EMAIL}
                </a>.
              </p>
            </section>

            <hr className="border-border" />

            {/* 7. Security */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">7. Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard technical and organisational security measures, including 256-bit TLS
                encryption for data in transit, hashed password storage, and role-based access controls. While we
                strive to protect your data, no online system is 100% secure. Please use a strong, unique password
                and contact us immediately if you suspect unauthorised access to your account.
              </p>
            </section>

            <hr className="border-border" />

            {/* 8. Third-Party Links */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">8. Third-Party Links</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Platform may contain links to third-party websites (e.g., shipping carriers, logistics portals).
                We are not responsible for the privacy practices of those sites. We encourage you to review their
                privacy policies before providing any personal information.
              </p>
            </section>

            <hr className="border-border" />

            {/* 9. Children's Privacy */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Platform is intended for users who are 18 years of age or older. We do not knowingly collect
                personal information from minors. If we become aware that a user under 18 has registered, we will
                terminate the account and delete associated data promptly.
              </p>
            </section>

            <hr className="border-border" />

            {/* 10. Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">10. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. When we make material changes, we will notify
                you via email or a prominent notice on the Platform at least 14 days before the changes take effect.
                Continued use of the Platform after the effective date constitutes acceptance of the updated Policy.
              </p>
            </section>

            <hr className="border-border" />

            {/* 11. Contact */}
            <section>
              <h2 className="text-2xl font-black text-foreground mb-4">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or concerns about this Privacy Policy or how we handle your data, please
                contact our Data Protection team:
              </p>
              <div className="mt-4 p-6 bg-muted/30 rounded-2xl border border-border space-y-2 text-sm">
                <p><strong>{SITE_NAME}</strong></p>
                <p>Email: <a href={`mailto:${CONTACT_INFO.EMAIL}`} className="text-electric-blue hover:underline">{CONTACT_INFO.EMAIL}</a></p>
                <p>Address: {CONTACT_INFO.ADDRESS}</p>
                <p>Support Hours: {CONTACT_INFO.SUPPORT_HOURS}</p>
              </div>
            </section>

            <hr className="border-border" />

            {/* Footer note */}
            <section className="text-center">
              <p className="text-sm text-muted-foreground">
                This policy should be read alongside our{" "}
                <Link href="/terms" className="text-electric-blue hover:underline font-medium">Terms of Service</Link>.
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

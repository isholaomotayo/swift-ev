import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Globe,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/constants";

const footerLinks = {
  platform: [
    { label: "Inventory", href: "/vehicles" },
    { label: "Live Bids", href: "/auctions" },
    { label: "Our Process", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
  ],
  support: [
    { label: "Help Center", href: "/help" },
    { label: "Contact Us", href: "/contact" },
    { label: "Shipping", href: "/shipping" },
    { label: "FAQs", href: "/faq" },
  ],
  company: [
    { label: "About autoexports", href: "/about" },
    { label: "Partner Program", href: "/partners" },
    { label: "Market Insights", href: "/blog" },
  ],
  legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Export License", href: "/license" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-white/5">
      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-8 group">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-brand-gold text-brand-primary transition-transform duration-300 group-hover:-rotate-6">
                <Globe className="h-6 w-6" />
              </div>
              <span className="font-black text-2xl tracking-tighter text-white">
                autoexports<span className="text-brand-gold">.live</span>
              </span>
            </Link>
            <p className="text-lg text-slate-400 mb-8 max-w-sm font-medium leading-relaxed">
              Premium global vehicle procurement and export logistics. Direct
              access to world-class inventory with end-to-end transparency.
            </p>

            {/* Contact Info */}
            <div className="space-y-4 text-sm font-bold uppercase tracking-widest">
              <div className="flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer">
                <Mail className="h-4 w-4 mr-3 text-brand-gold" />
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </div>
              <div className="flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer">
                <Phone className="h-4 w-4 mr-3 text-brand-gold" />
                <span>+234 XXX XXX XXXX</span>
              </div>
              <div className="flex items-center text-slate-500">
                <MapPin className="h-4 w-4 mr-3 text-brand-gold" />
                <span>Lagos • Dubai • Shanghai</span>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex items-center space-x-6 mt-10">
              {[
                { icon: <Twitter className="h-5 w-5" />, href: "#" },
                { icon: <Facebook className="h-5 w-5" />, href: "#" },
                { icon: <Instagram className="h-5 w-5" />, href: "#" },
                { icon: <Linkedin className="h-5 w-5" />, href: "#" },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="p-2 border border-white/10 rounded-md text-slate-500 hover:text-brand-gold hover:border-brand-gold transition-all"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs mb-8 italic">
              Platform
            </h3>
            <ul className="space-y-4">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs mb-8 italic">
              Company
            </h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs mb-8 italic">
              Legal
            </h3>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-16 bg-white/5" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
          <p>
            © {currentYear} {SITE_NAME}. All rights reserved.
          </p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <p>Digital Excellence</p>
            <p>Global Trade Compliance</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

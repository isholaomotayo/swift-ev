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
import * as m from "@/src/paraglide/messages.js";

const footerLinks = {
  platform: [
    { label: m.nav_inventory(), href: "/vehicles" },
    { label: m.nav_live_bids(), href: "/auctions" },
    { label: m.nav_our_process(), href: "/how-it-works" },
    { label: m.common_pricing_membership_autoexportslive().replace(" | autoexports.live", ""), href: "/pricing" },
  ],
  support: [
    { label: m.nav_help_center(), href: "/help" },
    { label: m.nav_contact_us(), href: "/contact" },
    { label: m.common_shipping_info(), href: "/shipping" },
    { label: m.common_faq_expert_support().replace(" — Expert Support", ""), href: "/faq" },
  ],
  company: [
    { label: m.nav_about_autoexports(), href: "/about" },
    { label: m.nav_partner_program(), href: "/partners" },
    { label: m.nav_market_insights(), href: "/blog" },
  ],
  legal: [
    { label: m.nav_terms_of_service(), href: "/terms" },
    { label: m.nav_privacy_policy(), href: "/privacy" },
    { label: m.nav_export_license(), href: "/license" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-200 border-t border-white/5">
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
            <p className="text-lg text-slate-300 mb-8 max-w-sm font-medium leading-relaxed">
              {m.nav_premium_global_vehicle_procurement_and_export_logi()}
            </p>

            {/* Contact Info */}
            <div className="space-y-4 text-sm font-bold uppercase tracking-widest">
              <div className="flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer">
                <Mail className="h-4 w-4 mr-3 text-brand-gold" />
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </div>
              <div className="flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer">
                <Phone className="h-4 w-4 mr-3 text-brand-gold" />
                <span>{m.auth_234_xxx_xxx_xxxx()}</span>
              </div>
              <div className="flex items-center text-slate-400">
                <MapPin className="h-4 w-4 mr-3 text-brand-gold" />
                <span>{m.nav_lagos_dubai_shanghai()}</span>
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
                  className="p-2 border border-white/10 rounded-md text-slate-400 hover:text-brand-gold hover:border-brand-gold transition-all"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs mb-8 italic">
              {m.nav_platform()}
            </h3>
            <ul className="space-y-4">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs mb-8 italic">
              {m.nav_company()}
            </h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs mb-8 italic">
              {m.nav_legal()}
            </h3>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
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
        <div className="flex flex-col md:flex-row justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          <p>
            © {currentYear} {SITE_NAME} {m.common_all_rights_reserved_only()}
          </p>
          <div className="flex gap-8 mt-4 md:mt-0">
            <p>{m.nav_digital_excellence()}</p>
            <p>{m.nav_global_trade_compliance()}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

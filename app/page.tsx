import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ConvexHttpClient } from "convex/browser";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Gavel,
  FileText,
  Truck,
  Globe,
  Zap,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeaturedVehicles, type Vehicle } from "@/components/home/featured-vehicles";
import { api } from "@/convex/_generated/api";
import { SITE_NAME } from "@/lib/constants";
import * as m from "@/src/paraglide/messages.js";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${SITE_NAME} - ${m.common_bid_win()} ${m.common_export()}`,
    description: m.common_direct_global_vehicle_exports_compete_for_quality_(),
  };
}

export default async function Home() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // Fetch data server-side
  let featuredVehicles: Vehicle[] = [];
  try {
    featuredVehicles = await convex.query(api.vehicles.getFeaturedVehicles, {});
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 text-foreground overflow-x-hidden">
      <Header />
      <main className="flex-1">
        {/* HERO SECTION - REBUILT FOR DEPTH & SOLIDITY */}
        <section className="relative pt-24 pb-32 bg-brand-primary text-white">
          <div className="container relative z-10 mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge className="mb-6 px-4 py-1.5 rounded-full bg-brand-accent text-white border-none uppercase tracking-widest font-bold text-[10px]">
                  {m.common_global_vehicle_procurement()}
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[0.95]">
                  {m.common_bid_win()} <br />
                  <span className="text-brand-gold">{m.common_export()}</span>
                </h1>
                <p className="text-xl text-slate-300 mb-10 leading-relaxed font-medium max-w-xl border-l-4 border-brand-accent pl-6">
                  {m.common_global_trade_invisible()}
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Button
                    size="lg"
                    className="h-16 px-10 text-lg rounded-md bg-brand-gold hover:bg-brand-gold/90 text-brand-primary font-black shadow-[4px_4px_0px_0px_rgba(245,158,11,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    asChild
                  >
                    <Link href="/register">{m.common_get_started()}</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 px-10 text-lg rounded-md border-2 border-white/20 text-white bg-transparent hover:bg-white/10 font-bold transition-all"
                    asChild
                  >
                    <Link href="/vehicles">{m.common_explore_inventory()}</Link>
                  </Button>
                </div>

                <div className="mt-12 flex items-center gap-8 text-slate-400">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {m.common_global_reach()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      {m.common_fully_insured()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-brand-gold/10 rounded-3xl -rotate-2" />
                <div className="relative aspect-[4/3] rounded-2xl border-4 border-white/10 bg-slate-800 shadow-2xl overflow-hidden">
                  <Image
                    src="/images/home-hero-clean.png"
                    alt={m.common_global_export_logistics()}
                    fill
                    className="object-cover object-center grayscale-[20%] hover:grayscale-0 transition-all duration-700"
                    priority
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-brand-primary/80 backdrop-blur-md border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-brand-gold font-black text-sm uppercase">
                          {m.common_live_market_data()}
                        </p>
                        <p className="text-white text-lg font-bold">
                          {m.common_12400_active_listings()}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-brand-success/20 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-brand-success" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAR - GROUNDED & SOLID */}
        <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <div className="container mx-auto px-4 flex items-center justify-between gap-12 text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-brand-blue" /> {m.common_escrow_protected()}
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-brand-success" /> {m.common_verified_inspections()}
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-brand-primary dark:text-slate-200" /> {m.common_documentation_support()}
            </div>
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-brand-gold" /> {m.common_doorstep_delivery_text()}
            </div>
            <div className="flex items-center gap-3">
              <Gavel className="h-5 w-5 text-brand-accent" /> {m.common_transparent_rules()}
            </div>
          </div>
        </section>

        {/* FEATURED AUCTIONS */}
        <section className="py-24 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
              <div className="border-l-8 border-brand-primary dark:border-brand-gold pl-8">
                <span className="text-brand-accent font-black uppercase tracking-[0.2em] text-xs">
                  {m.common_direct_from_inventory()}
                </span>
                <h3 className="text-4xl md:text-5xl font-black mt-2 text-brand-primary dark:text-white">
                  {m.common_featured_vehicles()}
                </h3>
              </div>
              <Button
                variant="ghost"
                className="group px-8 text-brand-primary dark:text-brand-gold font-black hover:bg-slate-100 dark:hover:bg-slate-800"
                asChild
              >
                <Link href="/vehicles" className="flex items-center">
                  {m.common_full_inventory()}{" "}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                </Link>
              </Button>
            </div>

            <FeaturedVehicles vehicles={featuredVehicles || []} />
          </div>
        </section>

        {/* HOW IT WORKS - GROUNDED PRODUCT FEEL */}
        <section className="py-24 bg-white dark:bg-slate-900">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-brand-primary dark:text-white italic">
                {m.common_the_export_journey()}
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-300 font-medium leading-relaxed">
                {m.common_weve_simplified_international_car_buying_into_thre()}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  step: "01",
                  title: m.common_strategic_search(),
                  desc: m.common_access_proprietary_filters_to_find_vehicles_that_m(),
                  color: "bg-brand-blue",
                  link: "/register",
                  cta: m.common_start_searching(),
                },
                {
                  step: "02",
                  title: m.common_verified_bidding(),
                  desc: m.common_our_escrow_system_keeps_your_deposit_safe_until_th(),
                  color: "bg-brand-accent",
                  link: "/vehicles",
                  cta: m.nav_live_bids(),
                },
                {
                  step: "03",
                  title: m.common_seamless_logistics(),
                  desc: m.common_tracking_from_port_of_origin_to_your_city_we_handl(),
                  color: "bg-brand-success",
                  link: "/how-it-works",
                  cta: m.common_shipping_info(),
                },
              ].map((item, i) => (
                <div key={i} className="group flex flex-col items-start">
                  <div
                    className={`h-16 w-16 ${item.color} text-white flex items-center justify-center rounded-lg font-black text-2xl mb-8 shadow-lg group-hover:rotate-6 transition-transform`}
                  >
                    {item.step}
                  </div>
                  <h3 className="text-2xl font-black text-brand-primary dark:text-white mb-4">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-300 mb-8 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                  <Link
                    href={item.link}
                    className="flex items-center text-brand-primary dark:text-brand-gold font-black uppercase text-xs tracking-widest hover:gap-3 transition-all"
                  >
                    {item.cta} <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPLETE VEHICLE SERVICES - REDESIGNED FOR CHARACTER */}
        <section className="py-24 bg-brand-primary text-white border-y border-white/5">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-[1fr_2fr] gap-20">
              <div>
                <h2 className="text-4xl md:text-5xl font-black leading-tight mb-8">
                  {m.common_endtoend()} <br />
                  <span className="text-brand-gold italic">{m.common_solutions()}</span>
                </h2>
                <p className="text-slate-300 text-lg font-medium leading-relaxed mb-10">
                  {m.common_global_trade_invisible()}
                </p>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-3xl font-black text-white">{m.common_100()}</p>
                    <p className="text-xs text-slate-300 uppercase tracking-widest font-bold mt-1">
                      {m.common_guaranteed_delivery()}
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-white">{m.common_247()}</p>
                    <p className="text-xs text-slate-300 uppercase tracking-widest font-bold mt-1">
                      {m.common_live_tracking()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: m.common_customs_clearance_title(),
                    icon: <Shield className="h-5 w-5" />,
                  },
                  {
                    title: m.common_direct_shipping_title(),
                    icon: <Truck className="h-5 w-5" />,
                  },
                  {
                    title: m.common_battery_health_certs_title(),
                    icon: <Zap className="h-5 w-5" />,
                  },
                  {
                    title: m.common_final_registration_title(),
                    icon: <FileText className="h-5 w-5" />,
                  },
                  {
                    title: m.common_insurance_coverage_title(),
                    icon: <CheckCircle2 className="h-5 w-5" />,
                  },
                  {
                    title: m.common_global_logistics_title(),
                    icon: <Globe className="h-5 w-5" />,
                  },
                ].map((service, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 p-6 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-4"
                  >
                    <div className="p-3 bg-brand-gold/10 rounded-md text-brand-gold">
                      {service.icon}
                    </div>
                    <span className="font-bold text-lg">{service.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

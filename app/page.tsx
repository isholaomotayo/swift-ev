import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ConvexHttpClient } from "convex/browser";
import { Zap, Shield, TrendingUp, Package, ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { FeaturedVehicles } from "@/components/home/featured-vehicles";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "VoltBid Africa - Premier Electric Vehicle Auction Platform",
  description: "Bid on quality electric vehicles directly from Chinese manufacturers. Complete import solution from China to your doorstep in Nigeria.",
  keywords: ["electric vehicles", "EV auction", "Nigeria", "BYD", "NIO", "XPeng", "vehicle import", "auction platform", "Africa"],
};

export default async function Home() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // Fetch data server-side
  let featuredVehicles: any[] = [];
  let stats: any = null;

  try {
    [featuredVehicles, stats] = await Promise.all([
      convex.query(api.vehicles.getFeaturedVehicles, {}),
      convex.query(api.vehicles.getVehicleStats, {}),
    ]);
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300 selection:bg-electric-blue/30">
      <Header />
      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-20">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-blue/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-volt-green/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 dark:opacity-20" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 backdrop-blur-md mb-10 hover:bg-primary/10 transition-colors cursor-default">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-volt-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-volt-green"></span>
              </span>
              <span className="text-xs font-bold tracking-widest uppercase opacity-80">Next-Gen EV Auction Platform</span>
            </div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05]">
              Own the future <br />
              <span className="text-gradient">Start Bidding</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed">
              Securely bid on premium electric vehicles from global manufacturers.
              We bridge the gap between China and Africa with a seamless import experience.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button size="lg" className="h-16 px-10 text-lg rounded-full bg-electric-blue hover:bg-electric-blue-dark text-white shadow-2xl shadow-electric-blue/20 group transition-all" asChild>
                <Link href="/vehicles">
                  Explore Auctions
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-16 px-10 text-lg rounded-full border border-border hover:bg-accent group" asChild>
                <Link href="/how-it-works" className="flex items-center">
                  <span className="mr-3 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Play className="h-3 w-3 fill-current" />
                  </span>
                  Watch How it Works
                </Link>
              </Button>
            </div>

            {/* Hero Visual */}
            <div className="mt-24 md:mt-32 relative max-w-7xl mx-auto group perspective-1000">
              <div className="absolute inset-x-0 -bottom-1 h-32 bg-gradient-to-t from-background to-transparent z-10" />
              <div className="relative rounded-[3rem] overflow-hidden border border-border shadow-2xl shadow-primary/10 aspect-[16/7] md:aspect-[21/9] transform group-hover:rotate-x-2 transition-transform duration-700 ease-out">
                <Image
                  src="/images/home-hero-clean.png"
                  alt="Premium EV Experience"
                  fill
                  className="object-cover scale-105 group-hover:scale-100 transition-transform duration-1000"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              {/* Floating Stats Card */}
              {stats && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[90%] md:w-full max-w-4xl grid grid-cols-3 gap-1 p-2 rounded-3xl glass-morphism z-20 overflow-hidden shadow-2xl backdrop-blur-xl bg-background/40">
                  <div className="p-4 md:p-8 text-center border-r border-white/5">
                    <div className="text-2xl md:text-4xl font-black mb-1 text-foreground">{stats.totalListings}+</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Listings</div>
                  </div>
                  <div className="p-4 md:p-8 text-center border-r border-white/5">
                    <div className="text-2xl md:text-4xl font-black text-volt-green mb-1">{stats.activeAuctions}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Live Now</div>
                  </div>
                  <div className="p-4 md:p-8 text-center">
                    <div className="text-2xl md:text-4xl font-black text-electric-blue mb-1">{stats.totalSold}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Vehicles Sold</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FEATURED AUCTIONS */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
              <div className="max-w-xl">
                <span className="text-sm font-black tracking-[0.2em] uppercase text-electric-blue block mb-4">Marketplace</span>
                <h3 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Featured Auctions</h3>
                <p className="text-muted-foreground text-lg">
                  Hand-picked electric vehicles with verified battery reports and
                  complete history documentation.
                </p>
              </div>
              <Button variant="outline" className="rounded-full group px-8" asChild>
                <Link href="/vehicles" className="flex items-center">
                  View marketplace <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            <FeaturedVehicles vehicles={featuredVehicles || []} />
          </div>
        </section>

        {/* WHY CHOOSE US - GRID */}
        <section className="py-32 bg-muted/30 border-y border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-electric-blue/5 blur-[100px] -z-10" />
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <span className="text-sm font-black tracking-[0.2em] uppercase text-volt-green block mb-4">Core Benefits</span>
              <h3 className="text-4xl md:text-5xl font-black mb-6">Why VoltBid Africa?</h3>
              <p className="text-muted-foreground text-lg">
                We've redesigned the vehicle import process from the ground up to ensure safety,
                transparency, and efficiency for every African buyer.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: <Zap className="h-8 w-8 text-electric-blue" />,
                  title: "EV Specialists",
                  desc: "Expert technical inspections focused on battery health and electronic systems."
                },
                {
                  icon: <Package className="h-8 w-8 text-volt-green" />,
                  title: "End-to-End Logistics",
                  desc: "We handle ocean freight, customs clearance, and last-mile delivery to your door."
                },
                {
                  icon: <Shield className="h-8 w-8 text-primary" />,
                  title: "Secure Payments",
                  desc: "Multicurrency escrow system protecting both buyers and sellers throughout the bid."
                },
                {
                  icon: <TrendingUp className="h-8 w-8 text-electric-blue" />,
                  title: "Transparent Pricing",
                  desc: "Complete duty and tax calculations provided upfront before you place a bid."
                }
              ].map((item, idx) => (
                <div key={idx} className="group p-8 rounded-3xl border border-border bg-card hover-lift transition-all">
                  <div className="mb-8 p-4 rounded-2xl bg-primary/5 inline-block group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h4 className="text-xl font-bold mb-4">{item.title}</h4>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS - STEPS */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <span className="text-sm font-black tracking-[0.2em] uppercase text-electric-blue block mb-4">Workflow</span>
                <h3 className="text-4xl md:text-5xl font-black mb-12 leading-tight">Simple process, <br />Global impact.</h3>

                <div className="space-y-12">
                  {[
                    { label: "01", title: "Registration", desc: "Create a verified account and complete our KYC process." },
                    { label: "02", title: "Place Bids", desc: "Find your desired EV and set your bidding strategy." },
                    { label: "03", title: "Logistics", desc: "Once you win, we handle all shipping and legal paperwork." },
                    { label: "04", title: "Delivery", desc: "Receive your vehicle and complete inspection at delivery." }
                  ].map((step, idx) => (
                    <div key={idx} className="flex gap-6 group">
                      <div className="text-4xl font-black text-primary/10 group-hover:text-primary/20 transition-colors">{step.label}</div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                        <p className="text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative aspect-square rounded-full border border-border p-8 md:p-16 overflow-hidden bg-gradient-to-tr from-primary/5 to-transparent flex items-center justify-center">
                <div className="absolute inset-0 bg-[url('/images/home-hero-clean.png')] bg-cover bg-center opacity-10 dark:opacity-20 mix-blend-overlay" />
                <div className="relative w-full h-full rounded-full glass-morphism border-primary/20 flex flex-col items-center justify-center text-center p-12">
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 animate-bounce-slow">
                    <Zap className="h-12 w-12 text-primary" />
                  </div>
                  <h4 className="text-2xl font-black mb-4">Start Your Journey</h4>
                  <p className="text-muted-foreground mb-8 text-sm">Join the shift to sustainable transportation across Africa.</p>
                  <Button className="rounded-full px-10 h-14" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto rounded-[3.5rem] bg-slate-900 p-12 md:p-24 text-center text-white relative overflow-hidden group border border-white/5">
              {/* Background Glow */}
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-electric-blue/10 blur-[120px] rounded-full transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />

              <div className="relative z-10">
                <h2 className="text-4xl md:text-7xl font-black mb-8 leading-[1.1]">Ready to drive <br /> the future?</h2>
                <p className="text-xl md:text-2xl opacity-80 mb-14 max-w-2xl mx-auto font-medium">
                  Join the largest community of EV enthusiasts in Africa.
                  Low emission, high performance.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Button size="lg" variant="secondary" className="h-16 px-12 text-lg rounded-full font-bold hover:scale-105 transition-transform" asChild>
                    <Link href="/register">Create Free Account</Link>
                  </Button>
                  <Button size="lg" variant="ghost" className="h-16 px-12 text-lg rounded-full border border-white/10 hover:bg-white/5 font-bold" asChild>
                    <Link href="/auctions">View Live Auctions</Link>
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

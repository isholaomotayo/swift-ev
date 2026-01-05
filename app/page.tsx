import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ConvexHttpClient } from "convex/browser";
import { Shield, ArrowRight, CheckCircle2, Gavel, FileText, Truck } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeaturedVehicles } from "@/components/home/featured-vehicles";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Auto Auctions Africa - Premier Vehicle Auction Platform",
  description: "100% Online Auto Auctions. Compete for quality vehicles from China, Japan, Germany & USA.",
};

export default async function Home() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // Fetch data server-side with retries for local dev stability
  let featuredVehicles: any[] = [];
  let stats: any = null;
  let retries = 3;

  while (retries > 0) {
    try {
      [featuredVehicles, stats] = await Promise.all([
        convex.query(api.vehicles.getFeaturedVehicles, {}),
        convex.query(api.vehicles.getVehicleStats, {}),
      ]);
      break; // Success!
    } catch (error: any) {
      retries--;
      if (retries === 0 || !error.message?.includes("fetch failed")) {
        console.error("Failed to fetch homepage data after retries:", error);
        break;
      }
      // Wait 500ms before retrying
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="flex-1">
        {/* HOW IT WORKS */}
        <section className="relative overflow-hidden bg-background pt-20 pb-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,102,255,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(0,210,106,0.14),_transparent_55%)]" />
          <div className="container relative z-10 mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-12">
              <div className="border-l-4 border-auction-gold pl-6">
                <span className="text-xs font-bold uppercase tracking-widest text-foreground/70 dark:text-muted-foreground">How It Works</span>
                <h2 className="text-3xl md:text-5xl font-black mt-2 text-foreground">Start bidding in three simple steps</h2>
                <p className="text-foreground/70 dark:text-muted-foreground text-lg mt-3 max-w-2xl">
                  Register, find your vehicle, and join live auctions backed by escrow and verified inspections.
                </p>
              </div>
              <Button variant="outline" className="rounded-full group px-8 border-auction-gold text-auction-gold hover:bg-auction-gold hover:text-deep-navy dark:hover:bg-auction-gold dark:hover:text-deep-navy transition-all" asChild>
                <Link href="/how-it-works" className="flex items-center">
                  Full Process <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border p-8 rounded-2xl shadow-lg relative overflow-hidden group hover:border-auction-gold/60 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-60">
                  <div className="h-12 w-12 rounded-full bg-auction-gold/15 flex items-center justify-center font-black text-auction-gold text-xl">1</div>
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Register</h3>
                <p className="text-foreground/70 dark:text-muted-foreground text-sm mb-4 min-h-[40px]">Create your account and choose a membership to unlock bidding power.</p>
                <Link href="/register" className="text-auction-gold font-bold text-sm uppercase tracking-wider flex items-center group-hover:gap-2 transition-all">
                  Join Now <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>

              <div className="bg-card border border-border p-8 rounded-2xl shadow-lg relative overflow-hidden group hover:border-trust-blue/60 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-60">
                  <div className="h-12 w-12 rounded-full bg-trust-blue/15 flex items-center justify-center font-black text-trust-blue text-xl">2</div>
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Find</h3>
                <p className="text-foreground/70 dark:text-muted-foreground text-sm mb-4 min-h-[40px]">Browse 10,000+ inspected cars, sedans, SUVs, and commercial vehicles.</p>
                <Link href="/vehicles" className="text-trust-blue font-bold text-sm uppercase tracking-wider flex items-center group-hover:gap-2 transition-all">
                  Search Vehicles <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>

              <div className="bg-card border border-border p-8 rounded-2xl shadow-lg relative overflow-hidden group hover:border-success-green/60 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-60">
                  <div className="h-12 w-12 rounded-full bg-success-green/15 flex items-center justify-center font-black text-success-green text-xl">3</div>
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">Bid</h3>
                <p className="text-foreground/70 dark:text-muted-foreground text-sm mb-4 min-h-[40px]">Join live weekday auctions and win deals with transparent bidding rules.</p>
                <Link href="/how-it-works" className="text-success-green font-bold text-sm uppercase tracking-wider flex items-center group-hover:gap-2 transition-all">
                  Learn How <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-24 bg-background dark:bg-deep-navy">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(7,96,156,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(7,96,156,0.25),_transparent_55%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(255,215,0,0.12),_transparent_40%)] dark:bg-[linear-gradient(120deg,_rgba(255,215,0,0.18),_transparent_40%)]" />
            <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10 dark:opacity-20" />
          </div>

          <div className="container relative z-10 mx-auto px-4 pt-10">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
              <div className="max-w-2xl">
                <Badge className="mb-5 px-4 py-1.5 rounded-full bg-auction-gold text-deep-navy border-none uppercase tracking-widest font-black text-[11px] shadow-lg shadow-auction-gold/20">
                  #1 Car Auction Platform in Africa
                </Badge>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-[1.05] text-foreground">
                  <span className="text-gradient">Bid. Win. Drive.</span>
                  <br />

                </h1>

                <p className="text-base md:text-lg text-foreground/70 dark:text-gray-300 mb-8 leading-relaxed font-medium max-w-xl border-l-4 border-auction-gold pl-6">
                  Over 10,000+ Used & Wholesale Vehicles. <br />
                  Compete for quality cars from China, Japan, Germany & USA.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Button
                    size="lg"
                    className="h-14 px-8 text-base rounded-lg bg-auction-gold hover:bg-amber-500 text-deep-navy font-black shadow-xl hover:translate-y-[-2px] transition-all"
                    asChild
                  >
                    <Link href="/register">
                      Register to Start Bidding
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-base rounded-lg border-2 border-trust-blue/40 text-trust-blue bg-transparent hover:bg-trust-blue hover:text-white font-bold transition-all dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                    asChild
                  >
                    <Link href="/vehicles">
                      Preview Inventory
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -top-6 -left-6 h-16 w-16 rounded-2xl bg-auction-gold/30 blur-2xl" />
                <div className="absolute -bottom-10 -right-6 h-24 w-24 rounded-full bg-trust-blue/30 blur-2xl" />
                <div className="relative aspect-[4/3] rounded-3xl border border-border bg-white shadow-2xl overflow-hidden dark:bg-white/5 dark:border-white/10">
                  <Image
                    src="/images/home-hero-clean.png"
                    alt="Luxury Vehicle"
                    fill
                    className="object-cover object-center"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED AUCTIONS (MOVED UP) */}
        <section className="relative py-20 bg-background transition-colors duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,102,255,0.08),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(0,102,255,0.18),_transparent_55%)]" />
          <div className="container relative z-10 mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-8">
              <div className="border-l-4 border-trust-blue pl-6">
                <h3 className="text-3xl md:text-5xl font-black mb-2 text-foreground">Popular Vehicles</h3>
                <p className="text-foreground/70 dark:text-muted-foreground text-lg max-w-2xl">
                  Bid on our most watched and featured inventory.
                </p>
              </div>
              <Button variant="outline" className="rounded-full group px-8 border-trust-blue text-trust-blue hover:bg-trust-blue hover:text-white dark:hover:bg-trust-blue dark:hover:text-white transition-all" asChild>
                <Link href="/vehicles" className="flex items-center">
                  View All Inventory <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            <FeaturedVehicles vehicles={featuredVehicles || []} />
          </div>
        </section>

        {/* TRUST BAR (Refined for Dark Mode) */}
        <section className="relative py-8 bg-muted/30 border-y border-border overflow-x-auto dark:bg-muted/10">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(0,210,106,0.08),_transparent_60%)] dark:bg-[linear-gradient(90deg,_rgba(0,210,106,0.12),_transparent_60%)]" />
          <div className="container relative z-10 mx-auto px-4 flex items-center justify-between min-w-[800px] gap-8 text-sm font-bold text-foreground/70 dark:text-muted-foreground">
            <div className="flex items-center gap-3"><Shield className="h-5 w-5 text-trust-blue" /> Escrow Protected</div>
            <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-success-green" /> Inspection Verified</div>
            <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-foreground" /> Document Support</div>
            <div className="flex items-center gap-3"><Truck className="h-5 w-5 text-auction-gold" /> Shipping & Clearing</div>
            <div className="flex items-center gap-3"><Gavel className="h-5 w-5 text-alert-red" /> Penalty Rules Transparent</div>
          </div>
        </section>

        {/* COMPLETE VEHICLE SERVICES */}
        <section className="py-24 bg-muted/20 text-foreground dark:bg-deep-navy dark:text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,102,255,0.12),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(0,210,106,0.12),_transparent_60%)]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <span className="text-gradient font-bold tracking-widest uppercase text-xs mb-4 block">End-to-End Solutions</span>
              <h2 className="text-4xl md:text-5xl font-black mb-6">Complete Vehicle Services</h2>
              <p className="text-xl text-foreground/70 dark:text-gray-400 max-w-2xl mx-auto">We handle the complexities of import, registration, and logistics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Clearing & Customs", desc: "SONCAP certification, duty payment, and port clearance handled for you." },
                { title: "Registration", desc: "Vehicle registration and plate number processing included." },
                { title: "Global Shipping", desc: "Container and RoRo shipping with real-time tracking dashboard." },
                { title: "Inspections", desc: "Detailed third-party condition reports before you bid." },
                { title: "Financing", desc: "Flexible payment plans from our verified partners." },
                { title: "Spare Parts", desc: "Access our network of spare parts suppliers." },
                { title: "Insurance", desc: "Comprehensive coverage options starting from delivery." },
                { title: "Tracking", desc: "Real-time updates from port to your doorstep." }
              ].map((service, i) => (
                <div key={i} className="bg-card border border-border p-8 rounded-xl shadow-sm hover:border-trust-blue/40 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 transition-colors group">
                  <h4 className="text-xl font-bold mb-3 text-foreground dark:text-white group-hover:text-trust-blue dark:group-hover:text-success-green transition-colors">{service.title}</h4>
                  <p className="text-foreground/70 dark:text-gray-400 text-sm leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="relative py-24 bg-background transition-colors duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,210,106,0.08),_transparent_55%)] dark:bg-[radial-gradient(circle_at_center,_rgba(0,102,255,0.16),_transparent_55%)]" />
          <div className="container relative z-10 mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto mb-20 text-center">
              <div>
                <div className="text-4xl font-black text-trust-blue mb-2">10k+</div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 dark:text-muted-foreground">Vehicles Listed</div>
              </div>
              <div>
                <div className="text-4xl font-black text-success-green mb-2">5k+</div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 dark:text-muted-foreground">Happy Buyers</div>
              </div>
              <div>
                <div className="text-4xl font-black text-foreground mb-2">98.5%</div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 dark:text-muted-foreground">Satisfaction</div>
              </div>
              <div>
                <div className="text-4xl font-black text-auction-gold mb-2">₦50B+</div>
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/60 dark:text-muted-foreground">Transactions</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Testimonials */}
              <div className="bg-card p-10 rounded-2xl shadow-xl border border-border">
                <div className="flex items-center justify-end mb-4 text-auction-gold text-xl tracking-tight">★★★★★</div>
                <p className="text-foreground/70 dark:text-muted-foreground italic mb-6 text-lg leading-relaxed">"I was skeptical about buying a car online, but Auto Auctions Africa made it seamless. Won a 2022 Camry for ₦2M below market value and it arrived in Lagos in perfect condition."</p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-deep-navy text-white flex items-center justify-center font-black">C</div>
                  <div>
                    <div className="font-bold text-foreground">Chidi O.</div>
                    <div className="text-sm text-foreground/60 dark:text-muted-foreground">Lagos, Nigeria</div>
                  </div>
                </div>
              </div>
              <div className="bg-card p-10 rounded-2xl shadow-xl border border-border">
                <div className="flex items-center justify-end mb-4 text-auction-gold text-xl tracking-tight">★★★★★</div>
                <p className="text-foreground/70 dark:text-muted-foreground italic mb-6 text-lg leading-relaxed">"As a dealer, I've moved over 50 vehicles through this platform. The escrow system protects both parties perfectly, and the inspection reports are incredibly accurate."</p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-deep-navy text-white flex items-center justify-center font-black">M</div>
                  <div>
                    <div className="font-bold text-foreground">Mohammed A.</div>
                    <div className="text-sm text-foreground/60 dark:text-muted-foreground">Kano, Nigeria</div>
                  </div>
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

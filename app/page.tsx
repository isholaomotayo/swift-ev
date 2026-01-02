import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ConvexHttpClient } from "convex/browser";
import { Zap, Shield, TrendingUp, Package } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { FeaturedVehicles } from "@/components/home/featured-vehicles";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "VoltBid Africa - Premier Electric Vehicle Auction Platform",
  description:
    "Bid on quality electric vehicles directly from Chinese manufacturers. Complete import solution from China to your doorstep in Nigeria.",
  keywords: [
    "electric vehicles",
    "EV auction",
    "Nigeria",
    "BYD",
    "NIO",
    "XPeng",
    "vehicle import",
    "auction platform",
    "Africa",
  ],
  openGraph: {
    title: "VoltBid Africa - Premier Electric Vehicle Auction Platform",
    description:
      "Bid on quality electric vehicles directly from Chinese manufacturers.",
    type: "website",
  },
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
    // Continue with empty data - error boundaries will handle errors
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#f7f8fb]">
          <div className="absolute inset-0">
            <div className="absolute -top-24 -right-32 h-96 w-96 rounded-full bg-electric-blue/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-volt-green/10 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,102,255,0.12),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(0,210,106,0.12),transparent_40%)]" />
          </div>

          <div className="container relative z-10 mx-auto px-4 py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200/70">
                  <span className="h-2 w-2 rounded-full bg-volt-green" />
                  Direct-from-manufacturer auctions
                </div>

                <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-slate-900 mt-6">
                  Own the electric future.
                  <span className="block text-slate-500">
                    Bid in China. Drive in Nigeria.
                  </span>
                </h1>

                <p className="mt-6 text-lg md:text-xl text-slate-700 leading-relaxed">
                  Securely bid on premium EVs with verified condition reports and
                  a full-service import team handling every step.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="h-14 px-8 text-lg bg-electric-blue hover:bg-electric-blue/90 shadow-lg shadow-blue-500/20 transition-transform hover:-translate-y-0.5"
                    asChild
                  >
                    <Link href="/vehicles">Start Bidding Now</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-lg border-slate-300 bg-white/60 backdrop-blur-md hover:bg-white/90 text-slate-900"
                    asChild
                  >
                    <Link href="/how-it-works">See How It Works</Link>
                  </Button>
                </div>

                {stats && (
                  <div className="mt-10 grid grid-cols-3 gap-4 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
                    <div>
                      <div className="text-2xl font-semibold text-slate-900">
                        {stats.totalListings}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Vehicles
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-slate-900">
                        {stats.activeAuctions}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Live Auctions
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-slate-900">
                        {stats.totalSold}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Sold
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-sm" />
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
                  <Image
                    src="/images/home-hero-clean.png"
                    alt="Featured electric vehicle"
                    fill
                    className="object-cover object-center"
                    priority
                  />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Average delivery
                    </p>
                    <p className="text-lg font-semibold text-slate-900">35-45 days</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Buyer protection
                    </p>
                    <p className="text-lg font-semibold text-slate-900">Verified sellers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Vehicles */}
        <section className="py-16 bg-gradient-to-b from-white to-slate-50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-electric-blue">
                  Featured Auctions
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold mt-3">
                  Fresh arrivals, curated for smart bidders
                </h2>
                <p className="text-muted-foreground mt-2 max-w-xl">
                  Explore the latest EV inventory with transparent condition reports
                  and real-time bidding windows.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/vehicles">View All</Link>
              </Button>
            </div>

            <FeaturedVehicles vehicles={featuredVehicles || []} />
          </div>
        </section>

        {/* Value Propositions */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl bg-slate-900 px-6 py-12 text-white md:px-12">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-volt-green">
                  The VoltBid Advantage
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold mt-4">
                  Built for confident buyers and fast-moving markets
                </h2>
                <p className="text-white/70 mt-4">
                  Every auction includes verified inspection reports, transparent fees,
                  and a logistics team that knows the Nigeria import landscape.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-volt-green">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">EV Expertise</h3>
                  <p className="mt-2 text-sm text-white/70">
                    Battery health insights and technical inspections you can trust.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-electric-blue">
                    <Package className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">Full Import Care</h3>
                  <p className="mt-2 text-sm text-white/70">
                    Shipping, customs, and delivery handled by one expert team.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-volt-green">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">Transparent Pricing</h3>
                  <p className="mt-2 text-sm text-white/70">
                    See your total landed cost before you place a bid.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-electric-blue">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">Buyer Protection</h3>
                  <p className="mt-2 text-sm text-white/70">
                    Verified sellers, condition reports, and clear guarantees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-col gap-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-electric-blue">
                  How It Works
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold">
                  A clear, guided path from bid to delivery
                </h2>
                <p className="text-muted-foreground">
                  We keep every step transparent so you can focus on winning the right vehicle.
                </p>
              </div>

              <div className="relative mt-12">
                <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-electric-blue/30 via-volt-green/40 to-electric-blue/30 md:block" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                  {[
                    {
                      step: "1",
                      title: "Browse & Register",
                      description:
                        "Explore listings and create a free account to start bidding.",
                    },
                    {
                      step: "2",
                      title: "Place Your Bid",
                      description:
                        "Join live auctions or set a proxy bid that works for you.",
                    },
                    {
                      step: "3",
                      title: "Win & Pay",
                      description:
                        "Complete payment securely while we handle paperwork.",
                    },
                    {
                      step: "4",
                      title: "Receive Your EV",
                      description:
                        "Track shipping and receive delivery at your doorstep.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70"
                    >
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-electric-blue text-white text-lg font-semibold">
                        {item.step}
                      </div>
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center mt-10">
                <Button asChild>
                  <Link href="/how-it-works">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-gradient-to-r from-electric-blue to-volt-green" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.3),transparent_40%)]" />
          <div className="container relative mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center text-white">
              <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
                Ready to drive electric in Nigeria?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join a growing network of buyers sourcing premium EVs with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/register">Create Account</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link href="/auctions">View Live Auctions</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

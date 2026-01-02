import type { Metadata } from "next";
import Link from "next/link";
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
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-muted/50 to-background py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Africa's Premier Electric Vehicle{" "}
                <span className="text-electric-blue">Auction Platform</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Bid on quality electric vehicles directly from Chinese
                manufacturers. We handle shipping, customs clearance, and
                delivery to your doorstep in Nigeria.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/vehicles">Browse Vehicles</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/how-it-works">How It Works</Link>
                </Button>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-8 mt-12 max-w-2xl mx-auto">
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-electric-blue">
                      {stats.totalListings}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Total Vehicles
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-volt-green">
                      {stats.activeAuctions}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Live Auctions
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-bold text-electric-blue">
                      {stats.totalSold}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Vehicles Sold
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Featured Vehicles */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Featured Vehicles</h2>
                <p className="text-muted-foreground">
                  Browse our latest electric vehicles up for auction
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
            <div className="mx-auto max-w-6xl">
              <h2 className="text-3xl font-bold text-center mb-12">
                Why Choose VoltBid Africa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-electric-blue/10 text-electric-blue mb-4">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">EV Expertise</h3>
                  <p className="text-sm text-muted-foreground">
                    Specialized in electric vehicle imports with comprehensive
                    battery health reports and technical inspections
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-volt-green/10 text-volt-green mb-4">
                    <Package className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    Complete Solution
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    End-to-end import handling from China to your doorstep
                    including shipping, customs, and delivery
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-electric-blue/10 text-electric-blue mb-4">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    Transparent Pricing
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    No hidden fees - see total costs upfront including duties,
                    taxes, and all associated charges
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-volt-green/10 text-volt-green mb-4">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    Buyer Protection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Detailed condition reports, money-back guarantees, and
                    verified seller credentials for peace of mind
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-3xl font-bold text-center mb-12">
                How VoltBid Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-electric-blue text-white font-bold text-xl mb-4">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Browse & Register</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse vehicles and create a free account to start bidding
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-electric-blue text-white font-bold text-xl mb-4">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Place Your Bid</h3>
                  <p className="text-sm text-muted-foreground">
                    Bid on your favorite EV or set a maximum auto-bid amount
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-electric-blue text-white font-bold text-xl mb-4">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">Win & Pay</h3>
                  <p className="text-sm text-muted-foreground">
                    If you win, complete payment and we handle all logistics
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-electric-blue text-white font-bold text-xl mb-4">
                    4
                  </div>
                  <h3 className="font-semibold mb-2">Receive Your EV</h3>
                  <p className="text-sm text-muted-foreground">
                    Track shipping and receive your EV at your doorstep
                  </p>
                </div>
              </div>

              <div className="text-center mt-8">
                <Button asChild>
                  <Link href="/how-it-works">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-electric-blue text-white">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Drive Electric?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of Nigerians making the switch to sustainable
                transportation
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/register">Create Account</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
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

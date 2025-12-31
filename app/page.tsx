import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

export default function Home() {
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
            </div>
          </div>
        </section>

        {/* Coming Soon Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold mb-4">
                Platform Under Development
              </h2>
              <p className="text-muted-foreground mb-6">
                We're building an amazing electric vehicle auction platform for
                Africa. Stay tuned for updates!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="p-6 border rounded-lg">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="font-semibold mb-2">EV Expertise</h3>
                  <p className="text-sm text-muted-foreground">
                    Specialized in electric vehicle imports with battery health
                    reports
                  </p>
                </div>
                <div className="p-6 border rounded-lg">
                  <div className="text-4xl mb-4">🚢</div>
                  <h3 className="font-semibold mb-2">Complete Solution</h3>
                  <p className="text-sm text-muted-foreground">
                    End-to-end import handling from China to your doorstep
                  </p>
                </div>
                <div className="p-6 border rounded-lg">
                  <div className="text-4xl mb-4">💰</div>
                  <h3 className="font-semibold mb-2">Transparent Pricing</h3>
                  <p className="text-sm text-muted-foreground">
                    No hidden fees - see total costs upfront including duties
                  </p>
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

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, TrendingUp, Building2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ServiceFeeCalculator } from "@/components/pricing/service-fee-calculator";

const tiers = [
  {
    name: "Guest",
    price: 0,
    priceLabel: "Free",
    description: "Browse vehicles only",
    features: [
      "Browse all vehicles",
      "View vehicle details",
      "Read condition reports",
    ],
    dailyBids: 0,
    buyingPower: "₦0",
    icon: Zap,
    popular: false,
  },
  {
    name: "Basic",
    price: 75000,
    priceLabel: "₦75,000",
    description: "Perfect for occasional buyers",
    features: [
      "Everything in Guest",
      "3 bids per day",
      "₦5M buying power",
      "Email support",
      "Watchlist (up to 10 vehicles)",
    ],
    dailyBids: 3,
    buyingPower: "₦5M",
    icon: Zap,
    popular: true,
  },
  {
    name: "Premier",
    price: 150000,
    priceLabel: "₦150,000",
    description: "For serious buyers",
    features: [
      "Everything in Basic",
      "10 bids per day",
      "₦50M buying power",
      "Priority support",
      "Dedicated account manager",
      "Unlimited watchlist",
      "Early access to new listings",
    ],
    dailyBids: 10,
    buyingPower: "₦50M",
    icon: TrendingUp,
    popular: false,
  },
  {
    name: "Business",
    price: 500000,
    priceLabel: "₦500,000",
    description: "For dealers and fleet operators",
    features: [
      "Everything in Premier",
      "Unlimited bids",
      "Unlimited buying power",
      "API access",
      "Bulk shipping discounts",
      "Custom payment terms",
      "Dedicated support team",
    ],
    dailyBids: "Unlimited",
    buyingPower: "Unlimited",
    icon: Building2,
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 z-0 opacity-20">
            <Image
              src="/images/pricing-bg.png"
              alt="Pricing Background"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Membership & Pricing
              </h1>
              <p className="text-xl text-gray-300">
                Choose the membership tier that fits your needs. All memberships
                are annual and include tax benefits.
              </p>
            </div>
          </div>
        </section>

        {/* Membership Tiers */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiers.map((tier) => {
                const Icon = tier.icon;
                return (
                  <Card
                    key={tier.name}
                    className={`p-6 relative ${tier.popular ? "border-electric-blue border-2" : ""
                      }`}
                  >
                    {tier.popular && (
                      <Badge className="absolute top-4 right-4 bg-electric-blue">
                        Most Popular
                      </Badge>
                    )}
                    <div className="mb-4">
                      <div className="w-12 h-12 rounded-full bg-electric-blue/10 flex items-center justify-center mb-3">
                        <Icon className="h-6 w-6 text-electric-blue" />
                      </div>
                      <h3 className="text-2xl font-bold mb-1">{tier.name}</h3>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold">
                          {tier.priceLabel}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground">/year</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tier.description}
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Daily Bids:
                        </span>
                        <span className="font-semibold">{tier.dailyBids}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Buying Power:
                        </span>
                        <span className="font-semibold">
                          {tier.buyingPower}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-volt-green flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href={tier.name === "Guest" ? "/vehicles" : "/register"}>
                      <Button
                        className="w-full"
                        variant={tier.popular ? "default" : "outline"}
                      >
                        {tier.name === "Guest" ? "Browse Now" : "Get Started"}
                      </Button>
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Service Fee Calculator */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <ServiceFeeCalculator />
            </div>
          </div>
        </section>

        {/* Additional Fees */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">
                Additional Fees
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-2">Documentation Fee</h3>
                  <p className="text-2xl font-bold mb-2">₦25,000</p>
                  <p className="text-sm text-muted-foreground">
                    Covers all import documentation, SONCAP certification, and
                    paperwork processing
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-2">Inspection Report</h3>
                  <p className="text-2xl font-bold mb-2">₦15,000</p>
                  <p className="text-sm text-muted-foreground">
                    Detailed vehicle inspection and battery health assessment
                    report
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-2">Port Handling</h3>
                  <p className="text-2xl font-bold mb-2">₦35,000</p>
                  <p className="text-sm text-muted-foreground">
                    Port handling and container unloading fees
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-2">Delivery Fee</h3>
                  <p className="text-2xl font-bold mb-2">Variable</p>
                  <p className="text-sm text-muted-foreground">
                    Depends on delivery location within Nigeria. Calculated at
                    checkout.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-electric-blue text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Bidding?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of buyers finding their perfect electric vehicle
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Create Account
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

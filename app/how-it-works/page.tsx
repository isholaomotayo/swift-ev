import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  Gavel,
  Package,
  CheckCircle,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const steps = [
  {
    number: 1,
    title: "Browse & Search",
    description:
      "Explore our catalog of quality electric vehicles from Chinese manufacturers. Use filters to find vehicles by make, model, year, battery health, and more.",
    icon: Search,
  },
  {
    number: 2,
    title: "Place Your Bid",
    description:
      "Join live auctions or place proxy bids. Set your maximum bid and let our system bid automatically on your behalf up to your limit.",
    icon: Gavel,
  },
  {
    number: 3,
    title: "Win & Pay",
    description:
      "If you win, complete payment securely through Paystack. We'll handle all documentation, shipping arrangements, and customs clearance.",
    icon: Package,
  },
  {
    number: 4,
    title: "Receive Your Vehicle",
    description:
      "Track your shipment from China to Nigeria. We handle port clearance, customs, and final delivery to your specified location.",
    icon: CheckCircle,
  },
];

const faqs = [
  {
    question: "How do I participate in auctions?",
    answer:
      "Simply create an account, browse vehicles, and join live auctions. You can place manual bids or set a maximum bid for automatic proxy bidding.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept payments via Paystack, which supports bank transfers, debit cards, and mobile money. All payments are secure and encrypted.",
  },
  {
    question: "How long does shipping take?",
    answer:
      "Shipping from China to Nigeria typically takes 35-45 days depending on the shipping method (container or RoRo) and port of departure.",
  },
  {
    question: "What documents do I need?",
    answer:
      "We handle all import documentation including SONCAP certification, Form M, and customs clearance. You'll need to provide a valid ID and proof of address.",
  },
  {
    question: "What if the vehicle has issues?",
    answer:
      "All vehicles come with detailed condition reports and battery health assessments. We provide inspection reports before shipping, and you can review all documentation before bidding.",
  },
  {
    question: "Can I cancel a bid?",
    answer:
      "Bids are binding once placed. However, you can cancel a proxy bid (max bid) before it's activated. Please review our terms and conditions for details.",
  },
  {
    question: "What are the import duties?",
    answer:
      "Electric vehicles enjoy reduced import duties (10-20%) and are exempt from VAT and IAT. We calculate all costs upfront so you know the total price before bidding.",
  },
  {
    question: "Do you offer financing?",
    answer:
      "Currently, we require full payment upon winning an auction. We're working on financing options and will announce them soon.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-black text-white">
          <div className="absolute inset-0 z-0 opacity-40">
            <Image
              src="/images/how-it-works-hero.png"
              alt="Global EV Logistics"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-volt-green">
                How VoltBid Works
              </h1>
              <p className="text-xl md:text-2xl text-gray-300">
                Your complete guide to buying electric vehicles through our
                global auction platform
              </p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <Card key={step.number} className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-electric-blue/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-electric-blue" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-electric-blue text-white flex items-center justify-center mx-auto mb-4 font-bold">
                      {step.number}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Process Flow */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                The Complete Process
              </h2>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-electric-blue text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Create Your Account
                    </h3>
                    <p className="text-muted-foreground">
                      Sign up for free and choose your membership tier. Basic
                      membership starts at ₦75,000/year and gives you access
                      to all auctions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-electric-blue text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Browse Vehicles
                    </h3>
                    <p className="text-muted-foreground">
                      Explore our catalog of electric vehicles. Each listing
                      includes detailed specifications, battery health reports,
                      condition assessments, and high-resolution images.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-electric-blue text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Join Live Auctions
                    </h3>
                    <p className="text-muted-foreground">
                      Participate in real-time auctions or place proxy bids.
                      Watch the action unfold as bidders compete for vehicles.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-electric-blue text-white flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Win & Complete Payment
                    </h3>
                    <p className="text-muted-foreground">
                      If you win, you'll receive a notification. Complete payment
                      securely through Paystack. Payment must be completed
                      within 48 hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-electric-blue text-white flex items-center justify-center font-bold">
                    5
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      We Handle Everything
                    </h3>
                    <p className="text-muted-foreground">
                      We coordinate shipping, handle all import documentation,
                      manage customs clearance, and arrange delivery to your
                      location. You can track progress in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-volt-green text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      Receive Your Vehicle
                    </h3>
                    <p className="text-muted-foreground">
                      Your vehicle arrives at your specified location. Complete
                      the delivery process and start enjoying your new electric
                      vehicle!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
                  <HelpCircle className="h-8 w-8" />
                  Frequently Asked Questions
                </h2>
                <p className="text-muted-foreground">
                  Everything you need to know about buying through VoltBid
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <Card key={index} className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-electric-blue text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of buyers finding their perfect electric vehicle
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="secondary">
                  Create Account
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/vehicles">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Browse Vehicles
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

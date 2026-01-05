"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Gavel,
  Shield,
  Timer,
  Truck,
  Wallet,
  HelpCircle,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type GuideBlock =
  | { readonly type: "steps"; readonly title: string; readonly items: readonly string[]; readonly note?: string }
  | { readonly type: "bullets"; readonly title: string; readonly items: readonly string[] }
  | { readonly type: "cards"; readonly title: string; readonly columns?: string; readonly items: readonly { readonly title: string; readonly description: string; readonly icon: React.ReactNode }[] }
  | { readonly type: "table"; readonly title: string; readonly columns: readonly string[]; readonly rows: readonly (readonly string[])[]; readonly note?: string }
  | { readonly type: "split"; readonly title: string; readonly columns: readonly { readonly title: string; readonly items: readonly string[] }[] };

const guideSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    summary: "Set up your account and get verified to start bidding with confidence.",
    blocks: [
      {
        type: "steps",
        title: "Creating your account",
        items: [
          "Click Start Bidding on the homepage.",
          "Choose your account type: Individual, Dealer/Reseller, or Corporate/Fleet.",
          "Complete your profile details and verify your phone number via OTP.",
          "Pay the one-time $3 verification fee.",
          "Complete KYC by uploading a valid ID.",
          "Fund your wallet to unlock bidding access.",
        ],
      },
      {
        type: "split",
        title: "Account types",
        columns: [
          {
            title: "Buyers",
            items: [
              "Individual — personal vehicle purchases",
              "Dealer/Reseller — licensed car dealers",
              "Corporate/Fleet — bulk and fleet procurement",
            ],
          },
          {
            title: "Sellers",
            items: [
              "Individual Seller — occasional listings",
              "Dealer — consistent dealer inventory",
              "Export Yard/Fleet — high-volume sellers",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "understanding-auction",
    title: "Understanding the Auction",
    summary: "Know how each auction type works and how vehicles are graded.",
    blocks: [
      {
        type: "cards",
        title: "Auction types",
        columns: "md:grid-cols-3",
        items: [
          {
            title: "Live Auction",
            description: "Real-time competitive bidding with scheduled start/end times and a 60-second anti-sniping rule.",
            icon: <Gavel className="h-4 w-4" />,
          },
          {
            title: "Pre-Bid Auction",
            description: "Place bids ahead of time; your bid joins automatically once live bidding starts.",
            icon: <Timer className="h-4 w-4" />,
          },
          {
            title: "Buy Now",
            description: "Lock in a fixed price immediately before the live auction begins.",
            icon: <BadgeCheck className="h-4 w-4" />,
          },
        ],
      },
      {
        type: "table",
        title: "Vehicle condition guide",
        columns: ["Condition", "Description"],
        rows: [
          ["Like New", "Minimal wear, fully functional"],
          ["Excellent", "Light use, minor cosmetic wear"],
          ["Good", "Normal wear, runs well"],
          ["Fair", "Visible wear, may need minor repairs"],
          ["Salvage", "Significant damage, for parts or rebuild"],
        ],
      },
    ],
  },
  {
    id: "bidding-basics",
    title: "Bidding Basics",
    summary: "Learn how bids work, from real-time bidding to proxy max bids.",
    blocks: [
      {
        type: "steps",
        title: "Placing a bid",
        items: [
          "Find a vehicle you want to bid on.",
          "Click Place Bid and enter your amount (must meet minimum increment).",
          "Confirm your bid to submit.",
        ],
        note: "All bids are binding and cannot be withdrawn.",
      },
      {
        type: "cards",
        title: "Bid tools",
        columns: "md:grid-cols-3",
        items: [
          {
            title: "Live Bid",
            description: "Real-time bidding during the live auction. Each bid resets the 60-second timer.",
            icon: <Gavel className="h-4 w-4" />,
          },
          {
            title: "Max Bid (Proxy)",
            description: "Set your maximum. The system bids the minimum needed to keep you ahead.",
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            title: "60-Second Rule",
            description: "Auction ends when 60 seconds pass with no new bids to prevent sniping.",
            icon: <Timer className="h-4 w-4" />,
          },
        ],
      },
      {
        type: "bullets",
        title: "Bid requirements",
        items: [
          "Wallet balance must be at least 10% of your bid.",
          "All bids are binding — no withdrawals.",
          "Winning bids require payment within the deadline.",
          "Outbid alerts are sent via app, email, and SMS.",
        ],
      },
    ],
  },
  {
    id: "winning-payment",
    title: "Winning & Payment",
    summary: "What happens after you win and how to complete payment on time.",
    blocks: [
      {
        type: "bullets",
        title: "When you win",
        items: [
          "Instant notifications via app, email, and SMS.",
          "Detailed invoice breakdown with totals.",
          "72-hour payment deadline.",
          "Access to optional services for logistics and documents.",
        ],
      },
      {
        type: "bullets",
        title: "Invoice contents",
        items: [
          "Winning bid amount",
          "Buyer premium (5%)",
          "Documentation fee",
          "Optional services",
          "Total amount due",
          "Payment deadline",
        ],
      },
      {
        type: "cards",
        title: "Payment methods",
        columns: "md:grid-cols-2",
        items: [
          {
            title: "Wallet Balance",
            description: "Pay directly with funds already in your Auto Auctions Africa wallet.",
            icon: <Wallet className="h-4 w-4" />,
          },
          {
            title: "Bank Transfer",
            description: "Send funds directly to the escrow account for secure settlement.",
            icon: <Shield className="h-4 w-4" />,
          },
          {
            title: "Card Payment",
            description: "Visa, Mastercard, and Verve accepted.",
            icon: <BadgeCheck className="h-4 w-4" />,
          },
          {
            title: "Split Payment",
            description: "Combine wallet balance with other payment methods.",
            icon: <ClipboardList className="h-4 w-4" />,
          },
        ],
      },
      {
        type: "bullets",
        title: "Late payment penalties",
        items: [
          "₦50,000 late fee plus 2% of invoice amount.",
          "₦10,000/day storage fees after the deadline.",
          "Risk of account suspension and deposit forfeiture.",
        ],
      },
    ],
  },
  {
    id: "shipping-delivery",
    title: "Shipping & Delivery",
    summary: "Choose pickup or logistics support and track shipment milestones.",
    blocks: [
      {
        type: "cards",
        title: "Fulfillment options",
        columns: "md:grid-cols-2",
        items: [
          {
            title: "Buyer Pickup (Local Vehicles)",
            description: "Schedule collection, present ID, and sign release documents on pickup day.",
            icon: <Truck className="h-4 w-4" />,
          },
          {
            title: "Platform Logistics (International)",
            description: "Select destination and shipping method (Container or RoRo) and track shipment progress.",
            icon: <ClipboardList className="h-4 w-4" />,
          },
        ],
      },
      {
        type: "table",
        title: "Typical shipping timelines",
        columns: ["Route", "Container", "RoRo"],
        rows: [
          ["China → Nigeria", "35-45 days", "30-40 days"],
          ["Japan → Nigeria", "40-50 days", "35-45 days"],
          ["USA → Nigeria", "45-60 days", "40-55 days"],
        ],
        note: "Timelines vary with vessel schedules and customs clearance.",
      },
      {
        type: "bullets",
        title: "Tracking your vehicle",
        items: [
          "Real-time location updates from your dashboard.",
          "Estimated arrival dates and milestone notifications.",
          "Document status updates and inspection photos.",
        ],
      },
    ],
  },
  {
    id: "seller-guide",
    title: "Seller Guide",
    summary: "List vehicles properly, choose a selling method, and get paid fast.",
    blocks: [
      {
        type: "split",
        title: "Listing requirements",
        columns: [
          {
            title: "Required information",
            items: [
              "VIN/Chassis number",
              "Make, model, year, trim",
              "Verified mileage",
              "Condition description",
              "Location",
            ],
          },
          {
            title: "Required media",
            items: [
              "Exterior photos (8+ angles)",
              "Interior photos (dash, seats, cargo)",
              "Engine bay photo",
              "Seat belt date tag photo",
              "10-second engine running video",
              "Dashboard lights video",
            ],
          },
        ],
      },
      {
        type: "cards",
        title: "Selling methods",
        columns: "md:grid-cols-3",
        items: [
          {
            title: "Auction with Reserve",
            description: "Set a minimum price. Accept, reject, or counter if the reserve isn't met.",
            icon: <Gavel className="h-4 w-4" />,
          },
          {
            title: "Auction without Reserve",
            description: "Sell to the highest bidder regardless to maximize interest.",
            icon: <Timer className="h-4 w-4" />,
          },
          {
            title: "Buy Now",
            description: "Set a fixed price. If unsold, it moves into live bidding.",
            icon: <BadgeCheck className="h-4 w-4" />,
          },
        ],
      },
      {
        type: "steps",
        title: "Getting paid",
        items: [
          "Buyer completes payment into escrow.",
          "You receive a Ready for Release notification.",
          "Schedule pickup or handover with the buyer/logistics team.",
          "Confirm vehicle release in your dashboard.",
          "Funds are released to your bank account within 24-48 hours.",
        ],
      },
    ],
  },
  {
    id: "fees-costs",
    title: "Fees & Costs",
    summary: "Transparent fees for buyers and sellers with no surprises.",
    blocks: [
      {
        type: "table",
        title: "Buyer fees",
        columns: ["Fee", "Amount"],
        rows: [
          ["Registration", "$3 (one-time)"],
          ["Buyer Premium", "5% of winning bid"],
          ["Documentation Fee", "₦25,000"],
          ["Late Payment", "₦50,000 + 2%"],
        ],
      },
      {
        type: "table",
        title: "Seller fees",
        columns: ["Fee", "Amount"],
        rows: [
          ["Listing Fee", "Free (promo) / ₦10,000"],
          ["Success Fee", "6-8% of sale price"],
          ["Featured Listing", "₦25,000 (optional)"],
        ],
      },
      {
        type: "bullets",
        title: "Additional services",
        items: [
          "Services are priced based on vehicle and destination.",
          "Estimates are provided during checkout before payment.",
        ],
      },
    ],
  },
  {
    id: "trust-safety",
    title: "Trust & Safety",
    summary: "Secure transactions, verified sellers, and clear dispute resolution.",
    blocks: [
      {
        type: "bullets",
        title: "Escrow protection",
        items: [
          "Payments are held in escrow until pickup or delivery is confirmed.",
          "Documents are verified before funds release to sellers.",
          "Sellers are paid only after buyer confirmation.",
        ],
      },
      {
        type: "cards",
        title: "Verification badges",
        columns: "md:grid-cols-2",
        items: [
          {
            title: "Verified Seller",
            description: "Identity confirmed through KYC.",
            icon: <BadgeCheck className="h-4 w-4" />,
          },
          {
            title: "Inspected Vehicle",
            description: "Third-party inspection completed.",
            icon: <Shield className="h-4 w-4" />,
          },
          {
            title: "Document-Ready",
            description: "All paperwork verified and ready for release.",
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            title: "Export-Ready",
            description: "Eligible for international shipping.",
            icon: <Truck className="h-4 w-4" />,
          },
        ],
      },
      {
        type: "steps",
        title: "Dispute resolution",
        items: [
          "Report issues within 24-72 hours of delivery or pickup.",
          "Upload supporting evidence (photos, videos, documents).",
          "Platform review determines the resolution.",
          "Outcome may be refund, partial refund, repair credit, or rejection.",
        ],
      },
    ],
  },
] as const;

function renderBlock(block: GuideBlock) {
  switch (block.type) {
    case "steps":
      return (
        <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-4">{block.title}</p>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {block.items.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-electric-blue/10 text-xs font-semibold text-electric-blue">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
          {"note" in block && block.note ? (
            <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-xs font-semibold text-foreground">
              {block.note}
            </p>
          ) : null}
        </div>
      );
    case "bullets":
      return (
        <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-4">{block.title}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {block.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-electric-blue" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "cards":
      return (
        <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-4">{block.title}</p>
          <div className={`grid gap-4 ${"columns" in block && block.columns ? block.columns : "md:grid-cols-2"}`}>
            {block.items.map((item) => (
              <div key={item.title} className="rounded-xl border bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-electric-blue/10 text-electric-blue">
                    {item.icon}
                  </span>
                  {item.title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "table":
      return (
        <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-4">{block.title}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {block.columns.map((column) => (
                    <th key={column} className="px-3 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    {(row as readonly string[]).map((cell, j) => (
                      <td key={`${i}-${j}`} className="px-3 py-3 text-muted-foreground">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {"note" in block && block.note ? (
            <p className="mt-3 text-xs text-muted-foreground">{block.note}</p>
          ) : null}
        </div>
      );
    case "split":
      return (
        <div className="rounded-2xl border bg-card/60 p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-4">{block.title}</p>
          <div className="grid gap-6 md:grid-cols-2">
            {block.columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {column.title}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-electric-blue" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string>(guideSections[0].id);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = guideSections
        .map((section) => ({
          id: section.id,
          element: document.getElementById(section.id),
        }))
        .reverse();

      for (const section of sectionElements) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 120) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-electric-blue/30">
      <Header />
      <main className="flex-1">
        {/* Hero Section - Immersive */}
        <section className="relative pt-32 pb-20 overflow-hidden border-b border-border">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-blue/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-volt-green/5 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10 dark:opacity-20 translate-y-20" />
          </div>

          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-3xl">
              <Badge className="mb-8 px-4 py-1.5 rounded-full bg-primary/5 text-primary border-primary/10 backdrop-blur-md uppercase tracking-widest font-bold text-[10px]">
                Member Resources
              </Badge>
              <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
                Bid, Win & Receive <br />
                <span className="text-gradient">With Confidence.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
                A comprehensive guide to navigating Nigeria's premier vehicle auction ecosystem.
                From registration to final delivery, we've got you covered.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="h-14 px-8 rounded-full bg-electric-blue hover:bg-electric-blue/90 text-white font-bold" asChild>
                  <Link href="/register">Start Bidding <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-full border-border/60 font-bold" asChild>
                  <Link href="/how-it-works">How it works</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-24">
          <div className="grid gap-16 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 opacity-50">Guide Sections</p>
                  <nav className="space-y-1">
                    {guideSections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300",
                          activeSection === section.id
                            ? "bg-foreground text-background shadow-lg shadow-black/5 translate-x-1"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <span>{section.title}</span>
                        <span className="text-[10px] opacity-40">{section.blocks.length}</span>
                      </a>
                    ))}
                  </nav>
                </div>

                <div className="rounded-[2rem] bg-muted/30 border border-border/40 p-8">
                  <HelpCircle className="h-8 w-8 text-electric-blue mb-4" />
                  <p className="font-bold text-lg mb-2 tracking-tight">Need Assistance?</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Our support team is ready to walk you through the process.
                  </p>
                  <Button variant="link" className="p-0 h-auto text-electric-blue font-bold" asChild>
                    <Link href="/faq">Visit Help Center <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            </aside>

            {/* Content Area */}
            <div className="lg:hidden">
              <div className="rounded-3xl border border-border/40 bg-card p-6 mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Jump to Section</p>
                <div className="flex flex-wrap gap-2">
                  {guideSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="px-4 py-2 rounded-full bg-muted text-xs font-bold hover:bg-muted/80 transition-colors"
                    >
                      {section.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-32">
              {guideSections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-32">
                  <div className="mb-12">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-electric-blue bg-electric-blue/5 px-3 py-1 rounded-full">Section {index + 1}</span>
                    <h2 className="mt-6 text-4xl font-black tracking-tight">{section.title}</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">{section.summary}</p>
                  </div>
                  <div className="grid gap-8 md:grid-cols-2">
                    {section.blocks.map((block, bIdx) => (
                      <div key={bIdx} className="md:first:col-span-2">
                        {renderBlock(block as GuideBlock)}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

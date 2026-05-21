import Link from "next/link";
import { Calendar, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex-server";
import { formatDate } from "@/lib/utils";
import * as m from "@/src/paraglide/messages.js";

export async function AuctionPromoBanner() {
  const convex = getConvexClient();
  let promo: {
    _id: string;
    name: string;
    status: string;
    scheduledStart: number;
    totalLots: number;
  } | null = null;

  try {
    promo = await convex.query(api.auctions.getPromotedAuction, {});
  } catch (error) {
    console.error("Failed to fetch promoted auction:", error);
  }

  if (!promo) {
    return null;
  }

  const isLive = promo.status === "live";
  const startLabel = formatDate(promo.scheduledStart);

  return (
    <section className="border-y border-brand-gold/30 bg-brand-primary text-white">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-gold text-brand-primary">
              {isLive ? <Gavel className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold mb-1">
                {isLive ? m.home_auction_live_now() : m.home_auction_coming_soon()}
              </p>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                {isLive
                  ? m.home_auction_live_title({ name: promo.name })
                  : m.home_auction_scheduled_title({ name: promo.name, date: startLabel })}
              </h2>
              <p className="text-sm text-slate-300 mt-1 font-medium">
                {m.home_auction_lots_count({ count: String(promo.totalLots) })}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button
              size="lg"
              className="h-12 px-8 bg-brand-gold hover:bg-brand-gold/90 text-brand-primary font-black uppercase tracking-widest"
              asChild
            >
              <Link href={isLive ? `/auctions/${promo._id}` : "/register"}>
                {isLive ? m.home_auction_join_live() : m.home_auction_register_now()}
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 border-white/30 text-white hover:bg-white/10 font-bold"
              asChild
            >
              <Link href="/auctions">{m.home_auction_view_all()}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

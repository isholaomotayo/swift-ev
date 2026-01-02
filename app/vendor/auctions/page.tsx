"use client";

import { useState, useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gavel, Clock } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function VendorAuctionsPage() {
  const { token } = useAuth();
  const convex = useConvex();
  const [auctions, setAuctions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch vendor auctions once on mount (no real-time subscription)
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    convex.query(api.auctions.getVendorAuctions, { token })
      .then((data) => {
        if (mounted) {
          setAuctions(data || []);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch vendor auctions:", error);
        if (mounted) {
          setAuctions([]);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [convex, token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "default";
      case "scheduled":
        return "secondary";
      case "ended":
        return "outline";
      default:
        return "outline";
    }
  };

  const getLotStatusColor = (status: string) => {
    switch (status) {
      case "sold":
        return "default";
      case "active":
        return "secondary";
      case "no_sale":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Auctions</h1>
        <p className="text-gray-500 mt-1">Track your vehicles in auctions</p>
      </div>

      {/* Auctions List */}
      {loading || auctions === null ? (
        <Card className="p-8 text-center text-gray-500">Loading...</Card>
      ) : auctions.length === 0 ? (
        <Card className="p-12 text-center">
          <Gavel className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No auctions yet</h3>
          <p className="text-gray-500">
            Your vehicles will appear here once they are added to an auction
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {auctions.map((auction) => (
            <Card key={auction._id} className="overflow-hidden">
              {/* Auction Header */}
              <div className="bg-gray-50 border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{auction.name}</h2>
                    {auction.description && (
                      <p className="text-sm text-gray-500 mt-1">{auction.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Scheduled Start</div>
                      <div className="font-medium">{formatDate(auction.scheduledStart)}</div>
                    </div>
                    <Badge variant={getStatusColor(auction.status)}>{auction.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Vendor's Lots in this Auction */}
              <div className="p-4">
                <h3 className="font-semibold mb-3">
                  Your Vehicles ({auction.vendorLots.length})
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Current Bid</TableHead>
                      <TableHead>Bids</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auction.vendorLots.map((lot) => (
                      <TableRow key={lot._id}>
                        <TableCell className="font-mono font-medium">
                          #{lot.vehicle.lotNumber}
                        </TableCell>
                        <TableCell>
                          {lot.vehicle.year} {lot.vehicle.make} {lot.vehicle.model}
                        </TableCell>
                        <TableCell className="font-medium">
                          {lot.currentBid
                            ? formatCurrency(lot.currentBid)
                            : formatCurrency(lot.startingBid)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lot.bidCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getLotStatusColor(lot.status)}>{lot.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {lot.endsAt ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-4 h-4" />
                              {new Date(lot.endsAt) > new Date()
                                ? `Ends ${formatDate(lot.endsAt)}`
                                : `Ended ${formatDate(lot.endsAt)}`}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not started</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

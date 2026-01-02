"use client";

import { useState, useMemo } from "react";
import { Plus, Calendar, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminAuctionsClientProps {
  initialAuctions: any[];
}

export function AdminAuctionsClient({ initialAuctions }: AdminAuctionsClientProps) {
  // Client-side filtering (no additional subscriptions)
  const liveAuctions = useMemo(() => 
    initialAuctions.filter(a => a.status === "live"),
    [initialAuctions]
  );
  
  const scheduledAuctions = useMemo(() => 
    initialAuctions.filter(a => a.status === "scheduled"),
    [initialAuctions]
  );
  
  const completedAuctions = useMemo(() => 
    initialAuctions.filter(a => a.status === "ended"),
    [initialAuctions]
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      draft: { className: "bg-muted text-muted-foreground", label: "Draft" },
      scheduled: { className: "bg-warning-amber/20 text-warning-amber border-warning-amber/30", label: "Scheduled" },
      live: { className: "bg-volt-green/20 text-volt-green border-volt-green/30", label: "Live" },
      paused: { className: "bg-warning-amber/20 text-warning-amber border-warning-amber/30", label: "Paused" },
      completed: { className: "bg-muted text-muted-foreground", label: "Completed" },
      cancelled: { className: "bg-error-red/20 text-error-red border-error-red/30", label: "Cancelled" },
    };

    const config = variants[status] || { className: "bg-muted text-muted-foreground", label: status };

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const renderAuctionTable = (auctions: any[]) => {
    if (auctions.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          No auctions found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Auction Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Lots</TableHead>
            <TableHead>Scheduled Start</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auctions.map((auction) => (
            <TableRow key={auction._id}>
              <TableCell>
                <div>
                  <p className="font-medium">{auction.name}</p>
                  {auction.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {auction.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="capitalize">{auction.auctionType}</TableCell>
              <TableCell>{getStatusBadge(auction.status)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">{auction.lotCount} total</p>
                  <p className="text-muted-foreground">
                    {auction.activeLotCount} active
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {auction.scheduledStart ? (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatDate(auction.scheduledStart, "PPp")}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not scheduled</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/auctions/${auction._id}`}>
                      Manage
                    </Link>
                  </Button>
                  {auction.status === "live" && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/auctions/${auction._id}`}>
                        <Play className="h-4 w-4 mr-1" />
                        View Live
                      </Link>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Auctions</h1>
          <p className="text-muted-foreground">
            Manage all auction events and lots
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/auctions/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Auction
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Auctions
            <Badge variant="secondary" className="ml-2">
              {initialAuctions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="live">
            Live
            {liveAuctions.length > 0 && (
              <Badge className="ml-2 bg-volt-green/20 text-volt-green border-volt-green/30">
                {liveAuctions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled
            {scheduledAuctions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {scheduledAuctions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completedAuctions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {completedAuctions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(initialAuctions)}
          </div>
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(liveAuctions)}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(scheduledAuctions)}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="bg-background border rounded-lg overflow-hidden">
            {renderAuctionTable(completedAuctions)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


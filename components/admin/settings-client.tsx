"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, Gavel } from "lucide-react";

interface SettingsClientProps {
  initialSettings: any;
  token: string;
}

export function SettingsClient({
  initialSettings,
  token,
}: SettingsClientProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Use useQuery for real-time updates
  const settings = useQuery(
    api.settings.getSettings,
    token ? { token } : "skip"
  ) ?? initialSettings;

  // Mutations
  const bulkUpdateSettings = useMutation(api.settings.bulkUpdateSettings);
  const initializeDefaults = useMutation(api.settings.initializeDefaultSettings);

  // Auction settings state
  const [auctionSettings, setAuctionSettings] = useState({
    defaultBidIncrement: "",
    defaultLotDuration: "",
    minimumReservePrice: "",
    autoExtendMinutes: "",
  });

  // Platform settings state
  const [platformSettings, setPlatformSettings] = useState({
    serviceFeePercent: "",
    documentationFee: "",
    companyName: "",
    supportEmail: "",
  });

  // Membership settings state
  const [membershipSettings, setMembershipSettings] = useState({
    basicPrice: "",
    premierPrice: "",
    businessPrice: "",
    basicDailyBidLimit: "",
    premierDailyBidLimit: "",
  });

  // Dev settings state
  const [devSettings, setDevSettings] = useState({
    enableQuickLogin: "false",
  });

  // Load settings when data arrives
  useEffect(() => {
    if (settings) {
      setAuctionSettings({
        defaultBidIncrement: settings["auction.defaultBidIncrement"] || "",
        defaultLotDuration: settings["auction.defaultLotDuration"] || "",
        minimumReservePrice: settings["auction.minimumReservePrice"] || "",
        autoExtendMinutes: settings["auction.autoExtendMinutes"] || "",
      });

      setPlatformSettings({
        serviceFeePercent: settings["platform.serviceFeePercent"] || "",
        documentationFee: settings["platform.documentationFee"] || "",
        companyName: settings["platform.companyName"] || "",
        supportEmail: settings["platform.supportEmail"] || "",
      });

      setMembershipSettings({
        basicPrice: settings["membership.basic.price"] || "",
        premierPrice: settings["membership.premier.price"] || "",
        businessPrice: settings["membership.business.price"] || "",
        basicDailyBidLimit: settings["membership.basic.dailyBidLimit"] || "",
        premierDailyBidLimit: settings["membership.premier.dailyBidLimit"] || "",
      });

      setDevSettings({
        enableQuickLogin: settings["dev.enableQuickLogin"] || "false",
      });
    }
  }, [settings]);

  const handleSaveAuctionSettings = async () => {
    if (!token) return;

    setLoading(true);
    try {
      await bulkUpdateSettings({
        token,
        settings: [
          {
            key: "auction.defaultBidIncrement",
            value: auctionSettings.defaultBidIncrement,
            description: "Default bid increment",
          },
          {
            key: "auction.defaultLotDuration",
            value: auctionSettings.defaultLotDuration,
            description: "Default lot duration in ms",
          },
          {
            key: "auction.minimumReservePrice",
            value: auctionSettings.minimumReservePrice,
            description: "Minimum reserve price",
          },
          {
            key: "auction.autoExtendMinutes",
            value: auctionSettings.autoExtendMinutes,
            description: "Auto-extend minutes",
          },
        ],
      });

      toast({
        title: "Success",
        description: "Auction settings saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlatformSettings = async () => {
    if (!token) return;

    setLoading(true);
    try {
      await bulkUpdateSettings({
        token,
        settings: [
          {
            key: "platform.serviceFeePercent",
            value: platformSettings.serviceFeePercent,
            description: "Service fee percentage",
          },
          {
            key: "platform.documentationFee",
            value: platformSettings.documentationFee,
            description: "Documentation fee",
          },
          {
            key: "platform.companyName",
            value: platformSettings.companyName,
            description: "Company name",
          },
          {
            key: "platform.supportEmail",
            value: platformSettings.supportEmail,
            description: "Support email",
          },
        ],
      });

      toast({
        title: "Success",
        description: "Platform settings saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMembershipSettings = async () => {
    if (!token) return;

    setLoading(true);
    try {
      await bulkUpdateSettings({
        token,
        settings: [
          {
            key: "membership.basic.price",
            value: membershipSettings.basicPrice,
            description: "Basic membership price",
          },
          {
            key: "membership.premier.price",
            value: membershipSettings.premierPrice,
            description: "Premier membership price",
          },
          {
            key: "membership.business.price",
            value: membershipSettings.businessPrice,
            description: "Business membership price",
          },
          {
            key: "membership.basic.dailyBidLimit",
            value: membershipSettings.basicDailyBidLimit,
            description: "Basic daily bid limit",
          },
          {
            key: "membership.premier.dailyBidLimit",
            value: membershipSettings.premierDailyBidLimit,
            description: "Premier daily bid limit",
          },
        ],
      });

      toast({
        title: "Success",
        description: "Membership settings saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDevSettings = async () => {
    if (!token) return;

    setLoading(true);
    try {
      await bulkUpdateSettings({
        token,
        settings: [
          {
            key: "dev.enableQuickLogin",
            value: devSettings.enableQuickLogin,
            description: "Enable quick login buttons for development",
          },
        ],
      });

      toast({
        title: "Success",
        description: "Development settings saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await initializeDefaults({ token });
      toast({
        title: "Success",
        description: `Initialized ${result.created} default settings`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure platform-wide settings</p>
        </div>
        <Button variant="outline" onClick={handleInitializeDefaults} disabled={loading}>
          <Settings className="w-4 h-4 mr-2" />
          Initialize Defaults
        </Button>
      </div>

      <Tabs defaultValue="auction" className="space-y-6">
        <TabsList>
          <TabsTrigger value="auction">
            <Gavel className="w-4 h-4 mr-2" />
            Auction
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Settings className="w-4 h-4 mr-2" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="membership">
            <Users className="w-4 h-4 mr-2" />
            Membership
          </TabsTrigger>
          <TabsTrigger value="dev">
            <Settings className="w-4 h-4 mr-2" />
            Development
          </TabsTrigger>
        </TabsList>

        {/* Auction Settings */}
        <TabsContent value="auction">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Auction Configuration</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultBidIncrement">Default Bid Increment</Label>
                  <Input
                    id="defaultBidIncrement"
                    type="number"
                    value={auctionSettings.defaultBidIncrement}
                    onChange={(e) =>
                      setAuctionSettings((s) => ({
                        ...s,
                        defaultBidIncrement: e.target.value,
                      }))
                    }
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">In currency units</p>
                </div>

                <div>
                  <Label htmlFor="defaultLotDuration">Default Lot Duration (ms)</Label>
                  <Input
                    id="defaultLotDuration"
                    type="number"
                    value={auctionSettings.defaultLotDuration}
                    onChange={(e) =>
                      setAuctionSettings((s) => ({
                        ...s,
                        defaultLotDuration: e.target.value,
                      }))
                    }
                    placeholder="300000"
                  />
                  <p className="text-xs text-gray-500 mt-1">300000 = 5 minutes</p>
                </div>

                <div>
                  <Label htmlFor="minimumReservePrice">Minimum Reserve Price</Label>
                  <Input
                    id="minimumReservePrice"
                    type="number"
                    value={auctionSettings.minimumReservePrice}
                    onChange={(e) =>
                      setAuctionSettings((s) => ({
                        ...s,
                        minimumReservePrice: e.target.value,
                      }))
                    }
                    placeholder="10000"
                  />
                </div>

                <div>
                  <Label htmlFor="autoExtendMinutes">Auto-Extend Time (minutes)</Label>
                  <Input
                    id="autoExtendMinutes"
                    type="number"
                    value={auctionSettings.autoExtendMinutes}
                    onChange={(e) =>
                      setAuctionSettings((s) => ({
                        ...s,
                        autoExtendMinutes: e.target.value,
                      }))
                    }
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveAuctionSettings} disabled={loading}>
                  {loading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Platform Settings */}
        <TabsContent value="platform">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Platform Configuration</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceFeePercent">Service Fee (%)</Label>
                  <Input
                    id="serviceFeePercent"
                    type="number"
                    value={platformSettings.serviceFeePercent}
                    onChange={(e) =>
                      setPlatformSettings((s) => ({
                        ...s,
                        serviceFeePercent: e.target.value,
                      }))
                    }
                    placeholder="5"
                  />
                </div>

                <div>
                  <Label htmlFor="documentationFee">Documentation Fee</Label>
                  <Input
                    id="documentationFee"
                    type="number"
                    value={platformSettings.documentationFee}
                    onChange={(e) =>
                      setPlatformSettings((s) => ({
                        ...s,
                        documentationFee: e.target.value,
                      }))
                    }
                    placeholder="500"
                  />
                </div>

                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={platformSettings.companyName}
                    onChange={(e) =>
                      setPlatformSettings((s) => ({
                        ...s,
                        companyName: e.target.value,
                      }))
                    }
                    placeholder="VoltBid Africa"
                  />
                </div>

                <div>
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={platformSettings.supportEmail}
                    onChange={(e) =>
                      setPlatformSettings((s) => ({
                        ...s,
                        supportEmail: e.target.value,
                      }))
                    }
                    placeholder="support@voltbid.africa"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSavePlatformSettings} disabled={loading}>
                  {loading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Membership Settings */}
        <TabsContent value="membership">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Membership Tiers</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="basicPrice">Basic Tier Price</Label>
                  <Input
                    id="basicPrice"
                    type="number"
                    value={membershipSettings.basicPrice}
                    onChange={(e) =>
                      setMembershipSettings((s) => ({
                        ...s,
                        basicPrice: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="basicDailyBidLimit">Basic Daily Bid Limit</Label>
                  <Input
                    id="basicDailyBidLimit"
                    type="number"
                    value={membershipSettings.basicDailyBidLimit}
                    onChange={(e) =>
                      setMembershipSettings((s) => ({
                        ...s,
                        basicDailyBidLimit: e.target.value,
                      }))
                    }
                    placeholder="3"
                  />
                </div>

                <div>
                  <Label htmlFor="premierPrice">Premier Tier Price</Label>
                  <Input
                    id="premierPrice"
                    type="number"
                    value={membershipSettings.premierPrice}
                    onChange={(e) =>
                      setMembershipSettings((s) => ({
                        ...s,
                        premierPrice: e.target.value,
                      }))
                    }
                    placeholder="9900"
                  />
                </div>

                <div>
                  <Label htmlFor="premierDailyBidLimit">Premier Daily Bid Limit</Label>
                  <Input
                    id="premierDailyBidLimit"
                    type="number"
                    value={membershipSettings.premierDailyBidLimit}
                    onChange={(e) =>
                      setMembershipSettings((s) => ({
                        ...s,
                        premierDailyBidLimit: e.target.value,
                      }))
                    }
                    placeholder="10"
                  />
                </div>

                <div>
                  <Label htmlFor="businessPrice">Business Tier Price</Label>
                  <Input
                    id="businessPrice"
                    type="number"
                    value={membershipSettings.businessPrice}
                    onChange={(e) =>
                      setMembershipSettings((s) => ({
                        ...s,
                        businessPrice: e.target.value,
                      }))
                    }
                    placeholder="49900"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveMembershipSettings} disabled={loading}>
                  {loading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Development Settings */}
        <TabsContent value="dev">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Development Tools</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-2xl">
                <div>
                  <Label htmlFor="enableQuickLogin" className="text-base font-bold">Enable Quick Login</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show quick login buttons on the login page for development testing.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    id="enableQuickLogin"
                    value={devSettings.enableQuickLogin}
                    onChange={(e) => setDevSettings({ enableQuickLogin: e.target.value })}
                    className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSaveDevSettings} disabled={loading}>
                  {loading ? "Saving..." : "Save Dev Settings"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


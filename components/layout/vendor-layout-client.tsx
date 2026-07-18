"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Car,
  Upload,
  BarChart3,
  Settings,
  Package,
  CreditCard,
  ShoppingBag,
  Clock,
} from "lucide-react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const vendorNavItems = [
  {
    label: "Dashboard",
    href: "/vendor",
    icon: LayoutDashboard,
  },
  {
    label: "My Vehicles",
    href: "/vendor/vehicles",
    icon: Car,
  },
  {
    label: "Upload Vehicle",
    href: "/vendor/vehicles/upload",
    icon: Upload,
  },
  {
    label: "My Auctions",
    href: "/vendor/auctions",
    icon: Package,
  },
  {
    label: "Pending payments",
    href: "/vendor/orders",
    icon: Clock,
  },
  {
    label: "My purchases",
    href: "/orders",
    icon: ShoppingBag,
  },
  {
    label: "Analytics",
    href: "/vendor/analytics",
    icon: BarChart3,
  },
  {
    label: "Bank / Payout",
    href: "/vendor/settings?tab=payout",
    icon: CreditCard,
  },
  {
    label: "Settings",
    href: "/vendor/settings",
    icon: Settings,
  },
];

interface VendorLayoutClientProps {
  children: React.ReactNode;
  user: {
    firstName: string;
    lastName: string;
    vendorCompany?: string;
  };
}

export function VendorLayoutClient({ children, user }: VendorLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user.vendorCompany?.trim() || `${user.firstName} ${user.lastName}`.trim();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background selection:bg-volt-green/30">
      {/* Mobile Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card lg:hidden sticky top-0 z-40">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-white dark:bg-brand-gold dark:text-brand-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe h-5 w-5">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
              <path d="M2 12h20"></path>
            </svg>
          </div>
          <span className="font-black text-xl tracking-tighter text-brand-primary dark:text-white">
            autoexports<span className="text-brand-gold">.live</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-muted-foreground hover:text-foreground"
        >
          {sidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </Button>
      </div>

      {/* Mobile Backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-72 bg-card border-r border-border fixed h-screen overflow-y-auto z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:left-0 lg:top-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-2 group mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white dark:bg-brand-gold dark:text-brand-primary transition-all duration-300 group-hover:rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe h-6 w-6">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                <path d="M2 12h20"></path>
              </svg>
            </div>
            <span className="font-black text-2xl tracking-tighter text-brand-primary dark:text-white">
              autoexports<span className="text-brand-gold">.live</span>
            </span>
          </Link>

          <div className="mb-6">
            <h3 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Menu
            </h3>
            <nav className="space-y-1">
              {vendorNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/vendor" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-volt-green/10 text-volt-green border border-volt-green/20 shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-volt-green" : "text-muted-foreground")} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 mb-4 backdrop-blur-sm">
              <p className="font-bold text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate opacity-80">
                {user.vendorCompany ? "Verified Vendor Account" : "Vendor Account"}
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-w-0">
        <div className="p-8 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

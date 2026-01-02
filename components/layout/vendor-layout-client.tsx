"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Car,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Package,
} from "lucide-react";
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
    label: "Analytics",
    href: "/vendor/analytics",
    icon: BarChart3,
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

  return (
    <div className="flex min-h-screen bg-background selection:bg-volt-green/30">
      {/* Sidebar */}
      <aside className="w-72 bg-card/80 backdrop-blur-xl border-r border-border fixed h-screen overflow-y-auto z-50 transition-all duration-300">
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-3 mb-10 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-volt-green to-emerald-600 shadow-lg shadow-volt-green/20 group-hover:shadow-volt-green/40 transition-all duration-300">
              <Zap className="h-7 w-7 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight block leading-none">
                VoltBid
              </span>
              <span className="text-xs font-bold text-volt-green uppercase tracking-widest">
                Vendor Portal
              </span>
            </div>
          </Link>

          <div className="mb-6">
            <h3 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Menu
            </h3>
            <nav className="space-y-1">
              {vendorNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

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
              <p className="font-bold text-sm truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate opacity-80">{user.vendorCompany || 'Vendor Account'}</p>
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
      <main className="flex-1 ml-72">
        <div className="p-8 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}


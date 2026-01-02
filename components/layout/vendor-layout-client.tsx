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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r fixed h-screen overflow-y-auto">
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-volt-green">
              <Zap className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="font-bold text-lg">
                VoltBid <span className="text-volt-green">Vendor</span>
              </span>
            </div>
          </Link>

          <nav className="space-y-1">
            {vendorNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-volt-green text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t">
            <div className="px-3 py-2 text-sm">
              <p className="font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground">{user.vendorCompany || 'Vendor'}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}


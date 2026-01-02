"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Car,
  Gavel,
  Users,
  Settings,
  Package,
  TrendingUp,
  LogOut,
  Zap
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNavItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Vehicles",
    href: "/admin/vehicles",
    icon: Car,
  },
  {
    label: "Auctions",
    href: "/admin/auctions",
    icon: Gavel,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: Package,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: TrendingUp,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "superadmin"))) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-electric-blue border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r fixed h-screen overflow-y-auto">
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-electric-blue">
              <Zap className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="font-bold text-lg">
                VoltBid <span className="text-electric-blue">Admin</span>
              </span>
            </div>
          </Link>

          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-electric-blue text-white"
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
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
              onClick={() => logout()}
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

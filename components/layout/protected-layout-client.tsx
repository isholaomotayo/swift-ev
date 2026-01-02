"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  LayoutDashboard,
  Heart,
  Gavel,
  ShoppingBag,
  User,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Watchlist",
    href: "/watchlist",
    icon: Heart,
  },
  {
    title: "My Bids",
    href: "/my-bids",
    icon: Gavel,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingBag,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
];

interface ProtectedLayoutClientProps {
  children: React.ReactNode;
  user: {
    role: string;
  };
}

import { cn } from "@/lib/utils";

export function ProtectedLayoutClient({ children, user }: ProtectedLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  // Redirect admin/vendor users to their respective dashboards
  useEffect(() => {
    if (user.role === "admin" || user.role === "superadmin") {
      router.push("/admin");
    } else if (user.role === "seller") {
      router.push("/vendor");
    }
  }, [user.role, router]);

  if (user.role === "admin" || user.role === "superadmin" || user.role === "seller") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-electric-blue/30">
      <Header />
      <div className="container mx-auto px-4 py-8 flex flex-1 gap-8">
        {/* Sidebar - Desktop */}
        <aside className="w-64 hidden lg:block shrink-0">
          <div className="sticky top-24 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-4 shadow-sm">
            <div className="mb-6 px-4 pt-2">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                My Account
              </h2>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div
                      className={cn(
                        "flex items-center px-4 py-3 rounded-xl transition-all duration-200 group",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold shadow-inner"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 mr-3 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      {item.title}
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            <Separator className="my-6 opacity-50" />

            <div className="px-2">
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
        <main className="flex-1 min-w-0">
          <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}


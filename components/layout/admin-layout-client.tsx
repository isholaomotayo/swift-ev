"use client";

import { useRouter, usePathname } from "next/navigation";
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

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background selection:bg-electric-blue/30">
      {/* Sidebar */}
      <aside className="w-72 bg-card/90 backdrop-blur-xl border-r border-border fixed h-screen overflow-y-auto z-50">
        <div className="p-6">
          <Link href="/" className="flex items-center space-x-3 mb-10 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-electric-blue to-blue-700 shadow-lg shadow-electric-blue/20 group-hover:shadow-electric-blue/40 transition-all duration-300">
              <Zap className="h-7 w-7 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight block leading-none">
                AutoExports
              </span>
              <span className="text-xs font-bold text-electric-blue uppercase tracking-widest">
                Admin Portal
              </span>
            </div>
          </Link>

          <div className="mb-6">
            <h3 className="px-3 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Management
            </h3>
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
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
                          ? "bg-electric-blue/10 text-electric-blue border border-electric-blue/20 shadow-sm"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-electric-blue" : "text-muted-foreground")} />
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
              <p className="text-xs text-muted-foreground truncate opacity-80 capitalize">{user.role}</p>
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


"use client";

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

export function ProtectedLayoutClient({ children, user }: ProtectedLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  // Redirect admin/vendor users to their respective dashboards
  if (user.role === "admin" || user.role === "superadmin") {
    router.push("/admin");
    return null;
  }

  if (user.role === "seller") {
    router.push("/vendor");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-background p-6 hidden lg:block">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </div>

          <Separator className="my-4" />

          <Button
            variant="ghost"
            className="w-full justify-start text-error-red hover:text-error-red"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}


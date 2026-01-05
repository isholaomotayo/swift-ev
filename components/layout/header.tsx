"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Bell, User, Zap, Wallet, Shield, FileText, ChevronDown, Car, Gavel, HelpCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const unreadNotifications = 0;
  const pathname = usePathname();

  const isNavLinkActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mr-10 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background transition-transform duration-300 group-hover:scale-110">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="hidden font-black text-xl md:inline-block tracking-tighter">
            Auto Auctions<span className="text-electric-blue">.</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          {[
            { href: "/vehicles", label: "Vehicles" },
            { href: "/auctions", label: "Auctions" },
            { href: "/how-it-works", label: "How It Works" },
            { href: "/guide", label: "Guide" },
            { href: "/faq", label: "FAQ" },
            { href: "/trust-safety", label: "Trust & Safety" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-4 py-2 text-sm font-bold tracking-tight transition-all duration-300 rounded-lg group",
                isNavLinkActive(item.href)
                  ? "text-foreground bg-secondary/50"
                  : "text-foreground/60 hover:text-foreground hover:bg-muted/50"
              )}
            >
              {item.label}
              <span className={cn(
                "absolute inset-x-4 -bottom-1 h-0.5 transition-all duration-300 origin-left",
                item.href === "/vehicles" ? "bg-electric-blue" : item.href === "/auctions" ? "bg-volt-green" : "bg-foreground/20",
                isNavLinkActive(item.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50"
              )} />
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden md:flex items-center ml-4 mr-2 group/search">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within/search:text-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-32 focus:w-64 pl-9 pr-4 h-10 text-sm bg-muted/20 border-border/40 focus:bg-background transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) rounded-xl focus:ring-0"
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/wallet" className="text-sm font-semibold tracking-tight hover:text-electric-blue transition-colors">
                ₦0.00
              </Link>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative hover:bg-muted/50">
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-electric-blue" />
                )}
              </Button>
            </div>
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full border border-border/40 hover:border-foreground/20 transition-all overflow-hidden">
                  <div className="h-full w-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-1 border-border/40 shadow-2xl">
                <div className="px-3 py-3 border-b border-border/40 mb-1">
                  <p className="text-sm font-bold tracking-tight">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{user?.email}</p>
                </div>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer focus:bg-muted/50 rounded-md">
                    <Link href="/dashboard" className="flex items-center justify-between w-full h-9">
                      <span className="text-sm font-medium">Dashboard</span>
                      <Zap className="h-3.5 w-3.5 text-electric-blue" />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuGroup>
                  {["Watchlist", "My Bids", "Orders", "Wallet", "Verification"].map((item) => (
                    <DropdownMenuItem key={item} asChild className="cursor-pointer focus:bg-muted/50 rounded-md">
                      <Link href={`/${item.toLowerCase().replace(" ", "-")}`} className="block w-full py-1.5">
                        <span className="text-sm font-medium text-foreground/80">{item}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuItem asChild className="cursor-pointer focus:bg-muted/50 rounded-md">
                  <Link href="/account" className="block w-full py-2 text-sm font-medium">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:bg-destructive/5 cursor-pointer rounded-md font-medium" onClick={() => logout()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold tracking-tight text-foreground/70 hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Button size="sm" asChild className="h-8 px-4 bg-foreground text-background hover:bg-foreground/90 rounded-full text-xs font-bold tracking-tight transition-transform active:scale-95">
                <Link href="/register">Join Now</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 md:hidden hover:bg-muted/50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-50 bg-background/98 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
          <div className="container mx-auto px-8 py-10 flex flex-col h-full">
            <div className="space-y-10">
              <section>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 opacity-50">Marketplace</p>
                <div className="flex flex-col gap-8">
                  <Link
                    href="/vehicles"
                    className={cn(
                      "text-4xl font-black tracking-tighter transition-all duration-300",
                      isNavLinkActive("/vehicles") ? "text-electric-blue translate-x-2" : "text-foreground/40 hover:text-foreground"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Vehicles
                    {isNavLinkActive("/vehicles") && <span className="ml-3 inline-block h-2 w-2 rounded-full bg-electric-blue animate-pulse" />}
                  </Link>
                  <Link
                    href="/auctions"
                    className={cn(
                      "text-4xl font-black tracking-tighter transition-all duration-300",
                      isNavLinkActive("/auctions") ? "text-volt-green translate-x-2" : "text-foreground/40 hover:text-foreground"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Auctions
                    {isNavLinkActive("/auctions") && <span className="ml-3 inline-block h-2 w-2 rounded-full bg-volt-green animate-pulse" />}
                  </Link>
                </div>
              </section>

              <section>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 opacity-50">Support & Community</p>
                <div className="grid grid-cols-1 gap-5">
                  {[
                    { href: "/how-it-works", label: "How It Works" },
                    { href: "/guide", label: "Member Guide" },
                    { href: "/faq", label: "FAQ" },
                    { href: "/trust-safety", label: "Trust & Safety" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "text-xl font-bold tracking-tight transition-all duration-300",
                        isNavLinkActive(item.href) ? "text-foreground translate-x-1" : "text-foreground/30 hover:text-foreground"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-auto space-y-6 pb-8">
              {!isAuthenticated ? (
                <div className="flex flex-col gap-4">
                  <Button size="lg" className="h-16 w-full bg-foreground text-background hover:bg-foreground/90 rounded-2xl text-lg font-black tracking-tight transition-transform active:scale-95" asChild>
                    <Link href="/register">Join the Marketplace</Link>
                  </Button>
                  <Button variant="ghost" size="lg" className="h-16 w-full rounded-2xl text-lg font-bold text-foreground/60 hover:text-foreground hover:bg-muted" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Authenticated as</p>
                    <p className="text-lg font-black tracking-tight truncate">{user?.firstName} {user?.lastName}</p>
                  </div>
                  <Button variant="ghost" className="h-14 w-full text-lg font-bold text-destructive hover:bg-destructive/5 rounded-2xl" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

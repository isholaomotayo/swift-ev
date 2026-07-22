"use client";

import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Search, Globe, Zap } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CurrencySelector } from "@/components/layout/currency-selector";
import { NotificationBell } from "@/components/layout/notification-bell";
import { cn } from "@/lib/utils";
import * as m from "@/src/paraglide/messages.js";
import { BRAND_TAGLINE } from "@/lib/constants";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Scroll event listener for scroll-aware borders/shadows (no height layout shift)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isNavLinkActive = (href: string) => pathname === href;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/vehicles?search=${encodeURIComponent(trimmed)}`);
    setMobileMenuOpen(false);
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md dark:bg-brand-primary/95 transition-all duration-300",
      isScrolled 
        ? "border-slate-200/80 shadow-sm dark:border-white/10" 
        : "border-slate-200 dark:border-white/5"
    )}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 mr-2 lg:mr-4 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white dark:bg-brand-gold dark:text-brand-primary transition-all duration-300 group-hover:rotate-3">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter text-brand-primary dark:text-white leading-none">
                autoexports<span className="text-brand-gold">.live</span>
              </span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                {BRAND_TAGLINE}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { href: "/vehicles", label: m.nav_inventory() },
              { href: "/auctions", label: m.nav_live_bids() },
              { href: "/how-it-works", label: m.nav_process() },
              { href: "/trust-safety", label: m.nav_verification() },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 lg:px-4 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 rounded-md",
                  isNavLinkActive(item.href)
                    ? "text-brand-primary bg-slate-100 dark:text-white dark:bg-white/10"
                    : "text-slate-500 hover:text-brand-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5",
                )}
              >
                {item.label}
                {isNavLinkActive(item.href) && (
                  <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-brand-gold" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 lg:gap-3 ml-auto">
            {/* Collapsible Search Input (Visible on md screens and up) */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:flex items-center relative"
            >
              <Search className={cn(
                "absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors duration-300 z-10",
                searchFocused ? "text-brand-primary dark:text-brand-gold" : ""
              )} />
              <Input
                type="search"
                placeholder={m.nav_search_vin_or_model()}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={cn(
                  "h-10 text-xs bg-slate-100 text-slate-700 placeholder:text-slate-400 border border-transparent transition-all duration-300 rounded-full dark:bg-white/5 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-200 dark:focus:border-white/10 outline-none placeholder:transition-opacity placeholder:duration-200",
                  searchFocused 
                    ? "w-60 pl-10 pr-4 opacity-100 placeholder:opacity-100" 
                    : "w-10 pl-10 pr-0 opacity-80 hover:opacity-100 placeholder:opacity-0 cursor-pointer select-none"
                )}
              />
            </form>

            {/* Desktop Switchers (Language, Currency, Theme) */}
            <div className="hidden lg:flex items-center gap-2">
              <LanguageSwitcher />
              <CurrencySelector />
              <ThemeToggle />
            </div>

            {/* Profile / Dropdown with Confidential Wallet Balance */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 rounded-lg border-2 border-slate-200 hover:border-brand-primary transition-all overflow-hidden dark:border-white/10"
                    >
                      <div className="h-full w-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-brand-primary dark:text-white">
                        {user?.firstName?.[0]}
                        {user?.lastName?.[0]}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 p-2 border-slate-200 text-foreground shadow-xl dark:bg-brand-primary dark:border-white/10"
                  >
                    <div className="px-3 py-4 border-b border-slate-100 mb-2 dark:border-white/5">
                      <p className="text-sm font-black text-brand-primary dark:text-white uppercase tracking-tight">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mt-1">
                        {user?.email}
                      </p>
                      
                      {/* Confidential Wallet Balance integrated inside User Profile Dropdown */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          {m.common_my_wallet()}
                        </span>
                        <Link
                          href="/wallet"
                          className="text-xs font-black text-brand-primary dark:text-brand-gold hover:underline tracking-widest"
                        >
                          ₦0.00
                        </Link>
                      </div>
                    </div>
                    
                    <DropdownMenuGroup className="space-y-1">
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer focus:bg-slate-100 dark:focus:bg-white/5 p-2 rounded-md transition-colors"
                      >
                        <Link
                          href="/dashboard"
                          className="flex items-center justify-between w-full"
                        >
                          <span className="text-sm font-bold">{m.nav_dashboard()}</span>
                          <Zap className="h-4 w-4 text-brand-gold" />
                        </Link>
                      </DropdownMenuItem>
                      {[
                        { label: m.common_my_watchlist(), href: "/watchlist" },
                        { label: m.common_my_bids(), href: "/my-bids" },
                        { label: m.common_my_orders_autoexportslive().replace(" | autoexports.live", ""), href: "/orders" },
                        { label: m.common_my_wallet(), href: "/wallet" }
                      ].map(
                        (item) => (
                          <DropdownMenuItem
                            key={item.href}
                            asChild
                            className="cursor-pointer focus:bg-slate-100 dark:focus:bg-white/5 p-2 rounded-md transition-colors"
                          >
                            <Link
                              href={item.href}
                              className="block w-full"
                            >
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {item.label}
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-2" />
                    <DropdownMenuItem
                      className="text-brand-accent focus:bg-brand-accent/5 dark:focus:bg-brand-accent/20 cursor-pointer p-2 rounded-md font-black italic uppercase text-xs"
                      onClick={() => logout()}
                    >
                      {m.nav_log_out()}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  size="sm"
                  asChild
                  className="h-10 sm:h-11 px-3 sm:px-5 bg-brand-primary text-white hover:bg-brand-primary shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] hover:translate-x-[2px] hover:translate-y-[2px] rounded-md text-xs font-black uppercase tracking-wider sm:tracking-[0.2em] transition-all dark:bg-brand-gold dark:text-brand-primary whitespace-nowrap"
                >
                  <Link href="/login">{m.common_log_in()}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 lg:hidden hover:bg-slate-100 dark:hover:bg-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 h-[calc(100vh-5rem)] z-[60] bg-white dark:bg-brand-primary animate-in fade-in slide-in-from-top-4 duration-300 overflow-y-auto">
          <div className="container mx-auto px-6 py-8 flex flex-col min-h-[calc(100vh-5rem)]">
            <div className="space-y-8">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  type="search"
                  placeholder={m.nav_search_vin_or_model()}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 pl-11 text-base rounded-xl border border-slate-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary dark:border-white/10 dark:focus:border-brand-gold dark:focus:ring-brand-gold bg-slate-50/50 dark:bg-white/5"
                />
              </form>

              {/* Navigation Links list */}
              <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-white/5 pt-6">
                {[
                  { href: "/vehicles", label: m.nav_inventory() },
                  { href: "/auctions", label: m.nav_live_bids() },
                  { href: "/how-it-works", label: m.nav_process() },
                  { href: "/trust-safety", label: m.nav_verification() },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between py-4 px-2 rounded-xl text-lg font-bold tracking-wide transition-all border-b border-slate-50 dark:border-white/5 last:border-b-0",
                      isNavLinkActive(item.href)
                        ? "text-brand-gold bg-slate-50 dark:bg-white/5 px-4"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{item.label}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-chevron-right h-4 w-4 transition-transform", isNavLinkActive(item.href) ? "text-brand-gold translate-x-1" : "text-slate-400")}>
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-8 pb-4">
              {!isAuthenticated ? (
                <>
                  <Button
                    size="lg"
                    className="h-12 w-full bg-brand-primary text-white hover:bg-brand-primary rounded-xl text-sm font-bold uppercase tracking-wider dark:bg-brand-gold dark:text-brand-primary shadow-lg shadow-brand-primary/10 dark:shadow-brand-gold/10"
                    asChild
                  >
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {m.nav_create_account()}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 w-full rounded-xl text-sm font-bold uppercase tracking-wider border-2 border-brand-primary/20 text-brand-primary hover:bg-slate-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
                    asChild
                  >
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {m.nav_sign_in()}
                    </Link>
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  className="h-12 w-full text-sm font-bold text-brand-accent uppercase tracking-wider hover:bg-brand-accent/5 rounded-xl"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  {m.nav_sign_out()}
                </Button>
              )}
            </div>

            {/* Mobile Toolbar (Switchers) */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-around gap-4 pb-4">
              <LanguageSwitcher />
              <CurrencySelector />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

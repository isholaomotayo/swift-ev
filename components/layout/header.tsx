"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
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
import { cn } from "@/lib/utils";
import * as m from "@/src/paraglide/messages.js";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isNavLinkActive = (href: string) => pathname === href;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/vehicles?search=${encodeURIComponent(trimmed)}`);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:bg-brand-primary/95 dark:border-white/10">
      <div className="container mx-auto flex h-20 items-center px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mr-12 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white dark:bg-brand-gold dark:text-brand-primary transition-all duration-300 group-hover:rotate-3">
            <Globe className="h-6 w-6" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-brand-primary dark:text-white">
            autoexports<span className="text-brand-gold">.live</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
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
                "relative px-5 py-2 text-sm font-black uppercase tracking-widest transition-all duration-300 rounded-md",
                isNavLinkActive(item.href)
                  ? "text-brand-primary bg-slate-100 dark:text-white dark:bg-white/10"
                  : "text-slate-500 hover:text-brand-primary hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5",
              )}
            >
              {item.label}
              {isNavLinkActive(item.href) && (
                <span className="absolute bottom-1 left-5 right-5 h-0.5 bg-brand-gold" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center group/search relative"
          >
            <Search className="absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within/search:text-brand-primary dark:group-focus-within/search:text-brand-gold pointer-events-none" />
            <Input
              type="search"
              placeholder={m.nav_search_vin_or_model()}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-48 focus:w-72 pl-10 pr-4 h-11 text-sm bg-slate-100 text-slate-700 placeholder:text-slate-500 border-transparent focus:bg-white focus:text-brand-primary focus:border-slate-300 transition-all duration-300 rounded-lg dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-white/10 dark:focus:text-white dark:focus:border-white/20"
            />
          </form>

          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                href="/wallet"
                className="hidden sm:block text-sm font-black tracking-widest text-brand-primary dark:text-brand-gold"
              >
                ₦0.00
              </Link>

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
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:block text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-primary transition-colors dark:text-slate-300 dark:hover:text-white"
              >
                {m.common_log_in()}
              </Link>
              <Button
                size="sm"
                asChild
                className="h-11 px-6 bg-brand-primary text-white hover:bg-brand-primary shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] hover:translate-x-[2px] hover:translate-y-[2px] rounded-md text-xs font-black uppercase tracking-[0.2em] transition-all dark:bg-brand-gold dark:text-brand-primary"
              >
                <Link href="/register">{m.nav_join_now()}</Link>
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

      {/* Mobile Menu - Rebuilt for solidity */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-50 bg-white dark:bg-brand-primary animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="container mx-auto px-6 py-12 flex flex-col h-full">
            <div className="space-y-12">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="search"
                  placeholder={m.nav_search_vin_or_model()}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-14 pl-12 text-lg rounded-xl border-2 border-slate-200 dark:border-white/10"
                />
              </form>
              <div className="flex flex-col gap-6">
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
                      "text-5xl font-black tracking-tighter transition-all duration-300 uppercase italic",
                      isNavLinkActive(item.href)
                        ? "text-brand-gold"
                        : "text-brand-primary/45 dark:text-white/45",
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-4 pb-12">
              {!isAuthenticated ? (
                <>
                  <Button
                    size="lg"
                    className="h-20 w-full bg-brand-primary text-white hover:bg-brand-primary rounded-xl text-xl font-black uppercase tracking-widest dark:bg-brand-gold dark:text-brand-primary"
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
                    className="h-20 w-full rounded-xl text-xl font-black uppercase tracking-widest border-2 border-brand-primary text-brand-primary dark:border-white dark:text-white"
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
                  className="h-20 w-full text-xl font-black text-brand-accent uppercase italic underline decoration-4"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  {m.nav_sign_out()}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

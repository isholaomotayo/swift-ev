"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountTypeStep, type AccountType } from "@/components/auth/account-type-step";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CurrencySelector } from "@/components/layout/currency-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type RegistrationStep = "account_type" | "form";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, loading: authLoading, actionLoading, user } = useAuth();

  const [step, setStep] = useState<RegistrationStep>("account_type");
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    preferredCurrency: "NGN",
    feeWaiverCode: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadingScreen = (
    <div className="flex min-h-screen bg-background items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-electric-blue" />
        <p className="text-muted-foreground font-medium">
          {isAuthenticated ? "Redirecting..." : "Loading..."}
        </p>
      </div>
    </div>
  );

  if (authLoading && !actionLoading) {
    return loadingScreen;
  }

  if (isAuthenticated) {
    if (user?.role === "seller") {
      router.push("/vendor");
    } else if (user?.role === "admin" || user?.role === "superadmin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    return loadingScreen;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!acceptedTerms) {
      setError("You must accept the terms and conditions");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        password: formData.password,
        accountType: accountType ?? "individual",
        preferredCurrency: formData.preferredCurrency,
        acceptedTerms: true,
        feeWaiverCode: formData.feeWaiverCode || undefined,
      });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Registration failed. Please try again."));
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "account_type":
        return "Select Account Type";
      case "form":
        return "Create Account";
    }
  };

  const getAccountTypeLabel = () => {
    if (!accountType) return "";
    const labels: Record<AccountType, string> = {
      individual: "Individual Buyer",
      dealer: "Dealer / Reseller",
      corporate: "Corporate / Fleet",
      seller_individual: "Individual Seller",
      seller_dealer: "Dealer",
      seller_fleet: "Export Yard / Fleet",
    };
    return labels[accountType];
  };

  return (
    <div className="flex min-h-screen bg-background relative">
      <div className="absolute top-6 right-6 z-20 flex items-center gap-1 p-1 rounded-xl bg-card/80 border border-border/50 backdrop-blur-md shadow-sm">
        <LanguageSwitcher />
        <CurrencySelector />
        <ThemeToggle />
      </div>

      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-full h-full bg-volt-green/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-full h-full bg-electric-blue/10 rounded-full blur-[150px]" />

        <div className="relative z-10">
          <Badge className="bg-white/10 text-white border-white/20 mb-6 font-bold tracking-wider">Fast-track Registration</Badge>
          <h2 className="text-6xl font-black leading-tight mb-8">
            Join the <br />
            <span className="text-gradient">Future of Mobility</span>
          </h2>
          <p className="text-xl text-white/70 max-w-lg mb-12 font-medium">
            Join autoexports.live and get access to exclusive vehicle auctions from leading manufacturers worldwide.
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          {[
            { label: "01", title: "Account Type", desc: "Choose buyer or seller" },
            { label: "02", title: "Your Details", desc: "Create your account and accept terms" },
            { label: "03", title: "Verify Email", desc: "Confirm your email to start browsing" },
          ].map((s, i) => {
            const stepIndex = { account_type: 0, form: 1 }[step];
            const isActive = i === stepIndex || (i === 2 && step === "form");
            const isComplete = i < stepIndex;

            return (
              <div key={i} className={`flex items-center gap-8 group ${isActive ? "opacity-100" : "opacity-50"}`}>
                <div className={`text-4xl font-black transition-colors ${isComplete ? "text-volt-green" : isActive ? "text-white" : "text-white/30"}`}>
                  {isComplete ? "✓" : s.label}
                </div>
                <div className={`p-6 rounded-[2rem] glass-morphism border-white/5 flex-1 transition-colors ${isActive ? "bg-white/10" : ""}`}>
                  <h4 className="font-black text-lg">{s.title}</h4>
                  <p className="text-white/50 text-sm font-medium">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 flex items-center justify-between opacity-50 text-sm font-medium">
          <span>&copy; 2026 autoexports.live</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Use</Link>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-volt-green/5 blur-[100px] -z-10" />

        <div className="mx-auto w-full max-w-md">
          <div className="mb-12">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-blue text-white shadow-xl shadow-electric-blue/20 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7" />
              </div>
              <span className="font-black text-2xl tracking-tighter">
                autoexports <span className="text-gradient">.live</span>
              </span>
            </Link>
          </div>

          <div className="mb-10">
            {step !== "account_type" && (
              <button
                onClick={() => setStep("account_type")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}

            <h2 className="text-4xl font-black tracking-tight mb-3">
              {getStepTitle()}
            </h2>

            {step === "account_type" && (
              <p className="text-muted-foreground font-medium">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-electric-blue hover:underline font-bold"
                >
                  Sign in instead
                </Link>
              </p>
            )}

            {step === "form" && accountType && (
              <p className="text-muted-foreground font-medium">
                Registering as: <span className="text-electric-blue font-bold">{getAccountTypeLabel()}</span>
              </p>
            )}
          </div>

          {step === "account_type" && (
            <AccountTypeStep
              selectedType={accountType}
              onSelect={setAccountType}
              onContinue={() => setStep("form")}
            />
          )}

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="h-14 rounded-2xl bg-muted/30 focus:bg-background border-border transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="h-14 rounded-2xl bg-muted/30 focus:bg-background border-border transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="h-14 rounded-2xl bg-muted/30 focus:bg-background border-border transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone (optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 XXX XXX XXXX"
                  className="h-14 rounded-2xl bg-muted/30 focus:bg-background border-border transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preferred Currency</Label>
                <Select
                  value={formData.preferredCurrency}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, preferredCurrency: val }))}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-border">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN — Nigerian Naira (₦)</SelectItem>
                    <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                    <SelectItem value="CNY">CNY — Chinese Yuan (¥)</SelectItem>
                    <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Prices in your dashboard will be shown in this currency.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feeWaiverCode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Promo / Waiver Code (Optional)
                </Label>
                <Input
                  id="feeWaiverCode"
                  name="feeWaiverCode"
                  type="text"
                  value={formData.feeWaiverCode}
                  onChange={handleChange}
                  placeholder="e.g. OWENYE_MVP"
                  className="h-14 rounded-2xl bg-muted/30 focus:bg-background border-border transition-all uppercase"
                />
                <p className="text-[11px] text-muted-foreground">
                  MVP invitees with a waiver code bypass initial registration & verification fees.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" title="At least 8 characters" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="h-14 rounded-2xl bg-muted/30 focus:bg-background border-border transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="h-14 rounded-2xl bg-muted/30 focus:bg-background border-border transition-all"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-2xl border border-border">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) =>
                    setAcceptedTerms(checked as boolean)
                  }
                  className="mt-1"
                />
                <label
                  htmlFor="terms"
                  className="text-xs leading-relaxed cursor-pointer font-medium text-muted-foreground"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="text-electric-blue hover:underline">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-electric-blue hover:underline">Privacy Policy</Link>
                </label>
              </div>

              {error && (
                <div className="rounded-2xl bg-error-red/10 border border-error-red/20 p-4">
                  <p className="text-sm text-error-red font-bold">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || actionLoading}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-electric-blue hover:bg-electric-blue-dark shadow-xl shadow-electric-blue/10 text-white"
              >
                {loading || actionLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Immediate free access is included with all accounts. You can sign in and start exploring right away.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AccountTypeStep, type AccountType } from "@/components/auth/account-type-step";

type RegistrationStep = "account_type" | "form" | "payment";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();

  const [step, setStep] = useState<RegistrationStep>("account_type");
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
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

    // Proceed to Payment Step
    setStep("payment");
  };

  const handlePayment = async () => {
    setLoading(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        password: formData.password,
        accountType: accountType ?? "individual",
      });

      // Show success message and redirect to login
      router.push("/login");
    } catch (error) {
      setError("Registration failed. Please try again.");
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "account_type":
        return "Select Account Type";
      case "form":
        return "Create Account";
      case "payment":
        return "Complete Registration";
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
    <div className="flex min-h-screen bg-background">
      {/* Left Column - Image/Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        {/* Abstract Background */}
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

        {/* Dynamic Step List */}
        <div className="relative z-10 space-y-8">
          {[
            { label: "01", title: "Account Type", desc: "Choose buyer or seller" },
            { label: "02", title: "Your Details", desc: "Quick and easy KYC process" },
            { label: "03", title: "Verification", desc: "One-time $3 verification fee" }
          ].map((s, i) => {
            const stepIndex = { account_type: 0, form: 1, payment: 2 }[step];
            const isActive = i === stepIndex;
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

      {/* Right Column - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-volt-green/5 blur-[100px] -z-10" />

        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
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
            {/* Back Button */}
            {step !== "account_type" && (
              <button
                onClick={() => setStep(step === "payment" ? "form" : "account_type")}
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

          {/* Step 1: Account Type Selection */}
          {step === "account_type" && (
            <AccountTypeStep
              selectedType={accountType}
              onSelect={setAccountType}
              onContinue={() => setStep("form")}
            />
          )}

          {/* Step 2: Form */}
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

              <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-electric-blue hover:bg-electric-blue-dark shadow-xl shadow-electric-blue/10">
                Continue to Verification
              </Button>
            </form>
          )}

          {/* Step 3: Payment */}
          {step === "payment" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Lock className="h-6 w-6 text-electric-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-deep-navy">Identity Verification</h3>
                  <p className="text-sm text-muted-foreground">To maintain a secure marketplace, we require a one-time verification fee.</p>
                </div>
                <div className="text-4xl font-black text-deep-navy">
                  $3.00 <span className="text-sm text-muted-foreground font-medium">USD</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-xl flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors border-electric-blue/50 bg-blue-50/50">
                  <div className="w-6 h-6 rounded-full border-4 border-electric-blue" />
                  <span className="font-bold flex-1">Credit / Debit Card</span>
                  <div className="flex gap-2">
                    <div className="w-8 h-5 bg-gray-200 rounded" />
                    <div className="w-8 h-5 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-error-red/10 border border-error-red/20 p-4">
                  <p className="text-sm text-error-red font-bold">{error}</p>
                </div>
              )}

              <Button
                onClick={handlePayment}
                disabled={loading}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-success-green hover:bg-green-600 shadow-xl shadow-green-600/10 text-white"
              >
                {loading ? "Processing Payment..." : "Pay & Create Account"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                <Lock className="h-3 w-3 inline mr-1" />
                Secure 256-bit encrypted payment
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle2, User, Mail, Phone, Lock } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);

    try {
      await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        password: formData.password,
      });

      // Show success message and redirect to login
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      // Error is handled by auth provider (toast)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Column - Image/Branding (Reversed for diversity from Login) */}
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
            Join VoltBid Africa and get access to exclusive electric vehicle auctions from leading Chinese manufacturers.
          </p>
        </div>

        {/* Dynamic Step List */}
        <div className="relative z-10 space-y-8">
          {[
            { label: "01", title: "Registration", desc: "Quick and easy KYC process" },
            { label: "02", title: "Browse & Bid", desc: "Access curated selection of EVs" },
            { label: "03", title: "Global Logistics", desc: "We handle shipping to your door" }
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-8 group">
              <div className="text-4xl font-black text-white/10 group-hover:text-volt-green transition-colors">{s.label}</div>
              <div className="p-6 rounded-[2rem] glass-morphism border-white/5 flex-1 group-hover:bg-white/5 transition-colors">
                <h4 className="font-black text-lg">{s.title}</h4>
                <p className="text-white/50 text-sm font-medium">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-between opacity-50 text-sm font-medium">
          <span>&copy; 2026 VoltBid Africa</span>
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
                VoltBid <span className="text-gradient">Africa</span>
              </span>
            </Link>
          </div>

          <div className="mb-10">
            <h2 className="text-4xl font-black tracking-tight mb-3">
              Create Account
            </h2>
            <p className="text-muted-foreground font-medium">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-electric-blue hover:underline font-bold"
              >
                Sign in instead
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-electric-blue hover:bg-electric-blue-dark shadow-xl shadow-electric-blue/10" disabled={loading}>
              {loading ? "Creating account..." : "Register Now"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

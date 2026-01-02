"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
    <div className="flex min-h-screen">
      {/* Left Column - Image/Branding */}
      <div className="relative hidden w-0 flex-1 lg:block bg-gradient-to-br from-electric-blue to-volt-green">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-white">
            <h2 className="text-4xl font-bold mb-4">
              Start Your Electric Journey Today
            </h2>
            <p className="text-lg opacity-90">
              Join VoltBid Africa and get access to exclusive electric vehicle
              auctions from leading Chinese manufacturers.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  1
                </div>
                <div>
                  <p className="font-semibold">Create Your Account</p>
                  <p className="text-sm opacity-80">
                    Quick and easy registration process
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  2
                </div>
                <div>
                  <p className="font-semibold">Browse & Bid</p>
                  <p className="text-sm opacity-80">
                    Access our curated selection of EVs
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  3
                </div>
                <div>
                  <p className="font-semibold">Win & Drive</p>
                  <p className="text-sm opacity-80">
                    We handle everything from shipping to delivery
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-electric-blue">
                <Zap className="h-6 w-6 text-white" fill="currentColor" />
              </div>
              <span className="font-bold text-2xl">
                VoltBid <span className="text-electric-blue">Africa</span>
              </span>
            </Link>

            <h2 className="text-3xl font-bold tracking-tight">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-electric-blue hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone number (optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 XXX XXX XXXX"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="mt-2"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) =>
                    setAcceptedTerms(checked as boolean)
                  }
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-none cursor-pointer"
                >
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-electric-blue hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-electric-blue hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {error && (
                <div className="rounded-md bg-error-red/10 border border-error-red/20 p-3">
                  <p className="text-sm text-error-red">{error}</p>
                </div>
              )}

              <div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

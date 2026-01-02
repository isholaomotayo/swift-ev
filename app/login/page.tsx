"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect based on user role when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "superadmin" || user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "seller") {
        router.push("/vendor");
      } else {
        router.push("/");
      }
    }
  }, [isAuthenticated, user, router]);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      // Redirect will happen via useEffect when user state updates
    } catch (error) {
      // Error is handled by auth provider (toast)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Column - Form */}
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
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-electric-blue hover:underline"
              >
                Register here
              </Link>
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-electric-blue hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2"
                />
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Button variant="outline" disabled>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button variant="outline" disabled>
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  GitHub
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Image/Branding */}
      <div className="relative hidden w-0 flex-1 lg:block bg-gradient-to-br from-electric-blue to-volt-green">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-white">
            <h2 className="text-4xl font-bold mb-4">
              Welcome to the Future of EV Auctions
            </h2>
            <p className="text-lg opacity-90">
              Join thousands of Nigerians who are making the switch to electric
              vehicles through our trusted auction platform.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Transparent Bidding</p>
                  <p className="text-sm opacity-80">
                    Real-time updates and no hidden fees
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Complete Import Solution</p>
                  <p className="text-sm opacity-80">
                    We handle shipping, customs, and delivery
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">Verified Vehicles</p>
                  <p className="text-sm opacity-80">
                    Detailed battery health reports and inspections
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

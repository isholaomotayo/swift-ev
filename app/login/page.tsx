"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { QuickLogin } from "@/components/auth/quick-login";

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
    } catch (error) {
      // Error is handled by auth provider (toast)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Column - Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 xl:px-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-electric-blue/5 blur-[100px] -z-10" />

        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-12">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-blue text-white shadow-xl shadow-electric-blue/20 group-hover:scale-110 transition-transform">
                <Zap className="h-7 w-7" fill="currentColor" />
              </div>
              <span className="font-black text-2xl tracking-tighter">
                autoexports <span className="text-gradient">.live</span>
              </span>
            </Link>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl font-black tracking-tight mb-3">
              Welcome Back
            </h2>
            <p className="text-muted-foreground font-medium">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-electric-blue hover:underline font-bold"
              >
                Create one for free
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-14 rounded-2xl border-border bg-muted/30 focus:bg-background transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-bold text-muted-foreground hover:text-electric-blue transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 rounded-2xl border-border bg-muted/30 focus:bg-background transition-all"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-bold bg-electric-blue hover:bg-electric-blue-dark shadow-xl shadow-electric-blue/10"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Continue"}
            </Button>
          </form>

          <QuickLogin />

          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-black tracking-[0.2em]">
                <span className="bg-background px-4 text-muted-foreground">
                  Or use social
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-14 rounded-2xl font-bold border-border group" disabled>
                <svg className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="h-14 rounded-2xl font-bold border-border group" disabled>
                <svg className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Image/Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-[-20%] right-[-20%] w-full h-full bg-electric-blue/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-full h-full bg-volt-green/10 rounded-full blur-[150px]" />

        <div className="relative z-10">
          <Badge className="bg-white/10 text-white border-white/20 mb-6">Trusted by 10k+ Africans</Badge>
          <h2 className="text-6xl font-black leading-tight mb-8">
            Experience the <br />
            <span className="text-gradient">Automotive Revolution</span>
          </h2>
          <p className="text-xl text-white/70 max-w-lg mb-12 font-medium">
            Join the continent's most transparent and advanced platform for importing quality vehicles directly from global manufacturers.
          </p>
        </div>

        {/* Feature List */}
        <div className="relative z-10 grid grid-cols-1 gap-8">
          {[
            { icon: <CheckCircle2 className="text-volt-green" />, title: "Wide Selection", desc: "Access global vehicle inventory" },
            { icon: <CheckCircle2 className="text-volt-green" />, title: "Verified Quality", desc: "Detailed inspection reports" },
            { icon: <CheckCircle2 className="text-volt-green" />, title: "Doorstep Delivery", desc: "Full logistics handled by us" }
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-6 p-6 rounded-[2rem] glass-morphism border-white/5 group hover:bg-white/10 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <div>
                <h4 className="font-black text-lg">{f.title}</h4>
                <p className="text-white/50 text-sm font-medium">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Credits */}
        <div className="relative z-10 flex items-center justify-between opacity-50 text-sm">
          <span>&copy; 2026 autoexports.live</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
          </div>
        </div>
      </div>
    </div >
  );
}

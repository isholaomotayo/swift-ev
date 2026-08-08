"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/lib/auth-errors";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  accountType?: "individual" | "dealer" | "corporate" | "seller_individual" | "seller_dealer" | "seller_fleet";
  membershipTier: "guest" | "basic" | "premier" | "business";
  emailVerified: boolean;
  kycStatus: "not_started" | "pending" | "approved" | "rejected";
  walletBalance?: number;
  buyingPower: number;
  status: "pending" | "active" | "suspended" | "banned";
  role?: "buyer" | "seller" | "admin" | "superadmin";
  verificationFeeStatus?: "not_paid" | "pending" | "paid";
  vendorCompany?: string;
  vendorLicense?: string;
  preferredCurrency?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** True while login/register/logout is in progress */
  actionLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<void>;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
  accountType?: "individual" | "dealer" | "corporate" | "seller_individual" | "seller_dealer" | "seller_fleet";
  preferredCurrency?: string;
}

interface ProfileUpdates {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  /**
   * Session token read server-side from the HttpOnly cookie by the root layout.
   * Seeding state from the server eliminates the client-side fetch round-trip
   * on mount and removes the auth loading flash on initial page load.
   */
  initialToken?: string | null;
}

export function AuthProvider({ children, initialToken = null }: AuthProviderProps) {
  // Token state is seeded directly from the server — no async fetch needed.
  const [token, setToken] = useState<string | null>(initialToken);
  // Action loading flag (login/register/logout operations in flight)
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Reactive Convex query — skipped entirely when no token is present,
  // so public pages with no session fire zero Convex queries.
  const user = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  ) as User | null | undefined;

  // Actions (bcrypt runs in the Convex Node.js runtime, not the V8 isolate)
  const loginAction = useAction(api.authActions.login);
  const registerAction = useAction(api.authActions.register);
  // Mutations (no bcrypt — safe in Convex V8 isolate)
  const logoutMutation = useMutation(api.auth.logout);
  const updateProfileMutation = useMutation(api.auth.updateProfile);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setActionLoading(true);
      const result = await loginAction({ email, password });

      // Persist as HttpOnly, Secure, SameSite=Strict cookie via server route
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: result.token }),
      });

      // Keep token in React memory so the Convex query stays live
      setToken(result.token);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.firstName}!`,
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: getAuthErrorMessage(error, "Invalid credentials"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (data: RegisterData): Promise<void> => {
    try {
      setActionLoading(true);
      await registerAction(data);

      toast({
        title: "Registration Successful",
        description: "Account created! Please check your email for a verification link before signing in.",
      });

      // Redirect to login with a flag so the page can show a success notice.
      router.push("/login?registered=true");
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: getAuthErrorMessage(error, "Failed to create account"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    try {
      // Invalidate the session record in Convex
      if (token) {
        await logoutMutation({ token });
      }

      // Clear the HttpOnly cookie via the server-side route handler
      await fetch("/api/auth/session", { method: "DELETE" });

      // Drop the in-memory token — Convex query will skip immediately
      setToken(null);

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Next.js router — no full page reload
      router.push("/");
    } catch {
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  // ── Update Profile ─────────────────────────────────────────────────────────
  const updateProfile = async (updates: ProfileUpdates): Promise<void> => {
    if (!token) {
      throw new Error("Not authenticated");
    }

    try {
      await updateProfileMutation({ token, updates });

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: getAuthErrorMessage(error, "Failed to update profile"),
        variant: "destructive",
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user: user ?? null,
    token,
    actionLoading,
    // Loading is true while:
    //  (a) a login/register/logout action is in flight, OR
    //  (b) a token exists but Convex hasn't returned the user object yet.
    loading: actionLoading || (token !== null && user === undefined),
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

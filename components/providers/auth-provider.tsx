"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  membershipTier: "guest" | "basic" | "premier" | "business";
  emailVerified: boolean;
  kycStatus: "pending" | "in_progress" | "approved" | "rejected";
  buyingPower: number;
  status: "pending" | "active" | "suspended" | "banned";
  role?: "user" | "seller" | "admin" | "superadmin";
  // Vendor-specific fields
  vendorCompany?: string;
  vendorLicense?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
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
}

interface ProfileUpdates {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "voltbid_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Get current user from token
  const user = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  ) as User | null | undefined;

  // Mutations
  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const logoutMutation = useMutation(api.auth.logout);
  const updateProfileMutation = useMutation(api.auth.updateProfile);

  // Helper to get cookie by name
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  // Load token from cookie on mount
  useEffect(() => {
    const storedToken = getCookie(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const result = await loginMutation({ email, password });

      // Store token in cookie
      setCookie(TOKEN_KEY, result.token, 30);
      setToken(result.token);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${result.user.firstName}!`,
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  };

  const deleteCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  };

  // Register function
  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      const result = await registerMutation(data);

      toast({
        title: "Registration Successful",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await logoutMutation({ token });
      }

      // Clear token
      deleteCookie(TOKEN_KEY);
      setToken(null);

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out",
        variant: "destructive",
      });
    }
  };

  // Update profile function
  const updateProfile = async (updates: ProfileUpdates) => {
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
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user: user || null,
    token,
    loading: loading || user === undefined,
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

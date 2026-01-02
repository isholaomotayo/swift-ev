"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  cookieName?: string;
  initialTheme?: Theme;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "dark" | "light";
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

// Cookie utility functions
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  cookieName = "voltbid-theme",
  initialTheme,
}: ThemeProviderProps) {
  // Initialize theme from cookie or prop, fallback to default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (initialTheme) return initialTheme;
    if (typeof document !== "undefined") {
      const cookieTheme = getCookie(cookieName) as Theme | null;
      if (cookieTheme && (cookieTheme === "dark" || cookieTheme === "light" || cookieTheme === "system")) {
        return cookieTheme;
      }
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "light";
    
    const currentTheme = initialTheme || (typeof document !== "undefined" ? getCookie(cookieName) as Theme | null : null) || defaultTheme;
    
    if (currentTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return currentTheme === "dark" ? "dark" : "light";
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from cookie on mount
    const cookieTheme = getCookie(cookieName) as Theme | null;
    if (cookieTheme && (cookieTheme === "dark" || cookieTheme === "light" || cookieTheme === "system")) {
      setThemeState(cookieTheme);
    }
  }, [cookieName]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;

    // Remove existing theme classes
    root.classList.remove("light", "dark");

    let resolved: "dark" | "light";

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      resolved = systemTheme;
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);
    root.classList.add(resolved);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const resolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolved);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setCookie(cookieName, newTheme);
    setThemeState(newTheme);
  };

  const value = {
    theme,
    setTheme,
    resolvedTheme,
  };

  // Always render the Provider
  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}


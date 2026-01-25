/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        // Brand Palette (autoexports.live)
        brand: {
          primary: "#0F172A", // Deep Slate/Black for depth
          accent: "#E11D48", // Rose/Red for character (more premium than generic red)
          gold: "#F59E0B", // Solid Gold
          blue: "#2563EB", // Solid Trust Blue
          success: "#10B981", // Solid Emerald
          surface: "#F8FAFC", // Light grayish background for depth
        },
        // Legacy/Alias mapping
        "auction-gold": "#F59E0B",
        "deep-navy": "#0F172A",
        "trust-blue": "#2563EB",
        "success-green": "#10B981",
        "alert-red": "#E11D48",
        "volt-green": "#10B981",
        "electric-blue": "#2563EB",
        "error-red": "#E11D48",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

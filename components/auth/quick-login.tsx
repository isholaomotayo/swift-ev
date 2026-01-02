"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Store } from "lucide-react";
import { useState } from "react";

export function QuickLogin() {
    const { login } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);

    const enableQuickLogin = useQuery(api.settings.getPublicSetting, {
        key: "dev.enableQuickLogin",
    });

    // Only show in development OR if enabled in settings
    // Using loose equality or checking for both boolean and string "true"
    const isEnabled = enableQuickLogin === true || enableQuickLogin === "true";
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev || !isEnabled) {
        return null;
    }

    const handleQuickLogin = async (role: string, email: string) => {
        setLoading(role);
        try {
            // Passwords from seedData.ts
            const password = role === "admin" ? "admin123" :
                role === "vendor" ? "vendor123" : "buyer123";
            await login(email, password);
        } catch (error) {
            console.error("Quick login failed", error);
        } finally {
            setLoading(null);
        }
    };

    const ROLES = [
        {
            name: "Admin",
            email: "admin@voltbid.africa",
            icon: <Shield className="w-4 h-4 mr-2" />,
            color: "bg-red-500/10 text-red-500 border-red-500/20",
        },
        {
            name: "Vendor",
            email: "vendor@bydnigeria.com",
            icon: <Store className="w-4 h-4 mr-2" />,
            color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        },
        {
            name: "Buyer",
            email: "john.doe@example.com",
            icon: <User className="w-4 h-4 mr-2" />,
            color: "bg-green-500/10 text-green-500 border-green-500/20",
        },
    ];

    return (
        <div className="mt-8 p-6 rounded-[2rem] border-2 border-dashed border-electric-blue/20 bg-electric-blue/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-electric-blue" />
                    Dev Quick Login
                </h3>
                <Badge variant="outline" className="bg-electric-blue/10 text-electric-blue border-electric-blue/20">
                    Dev Only
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {ROLES.map((role) => (
                    <Button
                        key={role.name}
                        variant="outline"
                        className={`h-12 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${role.color}`}
                        onClick={() => handleQuickLogin(role.name.toLowerCase(), role.email)}
                        disabled={!!loading}
                    >
                        {loading === role.name.toLowerCase() ? (
                            "Signing in..."
                        ) : (
                            <>
                                {role.icon}
                                {role.name}
                            </>
                        )}
                    </Button>
                ))}
            </div>
        </div>
    );
}

"use client";

import { KycVerification } from "@/components/kyc/kyc-verification";
import { Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm font-medium">Back to Dashboard</span>
                        </Link>
                    </div>
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-electric-blue text-white">
                            <Zap className="h-5 w-5" />
                        </div>
                        <span className="font-black text-lg tracking-tighter">
                            autoexports <span className="text-gradient">.live</span>
                        </span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black tracking-tight mb-2">Identity Verification</h1>
                        <p className="text-muted-foreground">
                            Complete verification to unlock full bidding access
                        </p>
                    </div>

                    <KycVerification />
                </div>
            </main>
        </div>
    );
}

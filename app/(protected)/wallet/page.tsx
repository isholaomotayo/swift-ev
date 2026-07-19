"use client";

import { WalletDashboard } from "@/components/wallet/wallet-dashboard";

export default function WalletPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight mb-2">My Wallet</h1>
                <p className="text-muted-foreground">
                    Manage your funds and track your transactions
                </p>
            </div>
            
            <WalletDashboard />
        </div>
    );
}

"use client";

import { User, Building2, Briefcase, Store, Factory, Truck } from "lucide-react";

export type AccountType =
    | "individual"
    | "dealer"
    | "corporate"
    | "seller_individual"
    | "seller_dealer"
    | "seller_fleet";

interface AccountTypeOption {
    type: AccountType;
    icon: React.ElementType;
    title: string;
    description: string;
    bestFor: string;
}

const buyerOptions: AccountTypeOption[] = [
    {
        type: "individual",
        icon: User,
        title: "Individual Buyer",
        description: "Personal vehicle purchases",
        bestFor: "First-time buyers, personal use",
    },
    {
        type: "dealer",
        icon: Store,
        title: "Dealer / Reseller",
        description: "Business vehicle purchases",
        bestFor: "Car dealers, resellers",
    },
    {
        type: "corporate",
        icon: Building2,
        title: "Corporate / Fleet",
        description: "Fleet and bulk purchases",
        bestFor: "Companies, rental services",
    },
];

const sellerOptions: AccountTypeOption[] = [
    {
        type: "seller_individual",
        icon: User,
        title: "Individual Seller",
        description: "Selling personal vehicles",
        bestFor: "Occasional listings",
    },
    {
        type: "seller_dealer",
        icon: Store,
        title: "Dealer",
        description: "Licensed car dealer",
        bestFor: "Regular listings",
    },
    {
        type: "seller_fleet",
        icon: Factory,
        title: "Export Yard / Fleet Owner",
        description: "High-volume seller",
        bestFor: "Bulk listing tools",
    },
];

interface AccountTypeStepProps {
    selectedType: AccountType | null;
    onSelect: (type: AccountType) => void;
    onContinue: () => void;
}

export function AccountTypeStep({
    selectedType,
    onSelect,
    onContinue,
}: AccountTypeStepProps) {
    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Buyer Options */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    I want to buy vehicles
                </h3>
                <div className="grid gap-3">
                    {buyerOptions.map((option) => (
                        <AccountTypeCard
                            key={option.type}
                            option={option}
                            isSelected={selectedType === option.type}
                            onSelect={() => onSelect(option.type)}
                        />
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    or
                </span>
                <div className="h-px flex-1 bg-border" />
            </div>

            {/* Seller Options */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    I want to sell vehicles
                </h3>
                <div className="grid gap-3">
                    {sellerOptions.map((option) => (
                        <AccountTypeCard
                            key={option.type}
                            option={option}
                            isSelected={selectedType === option.type}
                            onSelect={() => onSelect(option.type)}
                        />
                    ))}
                </div>
            </div>

            {/* Continue Button */}
            <button
                onClick={onContinue}
                disabled={!selectedType}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-electric-blue hover:bg-electric-blue-dark shadow-xl shadow-electric-blue/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                Continue
            </button>
        </div>
    );
}

function AccountTypeCard({
    option,
    isSelected,
    onSelect,
}: {
    option: AccountTypeOption;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const Icon = option.icon;

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`
        w-full p-4 rounded-2xl border-2 text-left transition-all
        ${isSelected
                    ? "border-electric-blue bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }
      `}
        >
            <div className="flex items-start gap-4">
                <div
                    className={`
            flex h-12 w-12 items-center justify-center rounded-xl shrink-0
            ${isSelected ? "bg-electric-blue text-white" : "bg-muted text-muted-foreground"}
          `}
                >
                    <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground">{option.title}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                    <div className="mt-1 text-xs text-muted-foreground/70">
                        Best for: {option.bestFor}
                    </div>
                </div>
                <div
                    className={`
            h-6 w-6 rounded-full border-2 shrink-0 flex items-center justify-center
            ${isSelected ? "border-electric-blue bg-electric-blue" : "border-muted-foreground/30"}
          `}
                >
                    {isSelected && (
                        <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    )}
                </div>
            </div>
        </button>
    );
}

import type { Metadata } from "next";
import { Shield, Lock, CheckCircle, AlertTriangle, Users, FileCheck, Scale, HeadphonesIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Trust & Safety | Auto Auctions Africa",
    description: "Learn how Auto Auctions Africa protects buyers and sellers with escrow, verification, and fraud prevention.",
};

export default function TrustSafetyPage() {
    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="bg-gradient-to-br from-deep-navy via-trust-blue to-electric-blue text-white py-20">
                <div className="container mx-auto px-4 text-center">
                    <Shield className="h-16 w-16 mx-auto mb-6 text-auction-gold" />
                    <h1 className="text-4xl md:text-5xl font-black mb-4">Trust & Safety</h1>
                    <p className="text-xl text-white/80 max-w-2xl mx-auto">
                        Your security is our priority. Learn how we protect every transaction on Auto Auctions Africa.
                    </p>
                </div>
            </section>

            <div className="container mx-auto px-4 py-16 max-w-5xl">
                {/* Escrow Protection */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 rounded-full bg-success-green/10 flex items-center justify-center">
                            <Lock className="h-6 w-6 text-success-green" />
                        </div>
                        <h2 className="text-3xl font-bold">Escrow Protection</h2>
                    </div>
                    <Card className="p-8 bg-success-green/5 border-success-green/20">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-3">How It Works</h3>
                                <ol className="space-y-3 text-muted-foreground">
                                    <li className="flex gap-3">
                                        <span className="h-6 w-6 rounded-full bg-success-green text-white flex items-center justify-center text-sm font-bold shrink-0">1</span>
                                        Buyer pays into Auto Auctions Africa escrow account
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="h-6 w-6 rounded-full bg-success-green text-white flex items-center justify-center text-sm font-bold shrink-0">2</span>
                                        Seller ships vehicle with tracking
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="h-6 w-6 rounded-full bg-success-green text-white flex items-center justify-center text-sm font-bold shrink-0">3</span>
                                        Buyer inspects and confirms delivery
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="h-6 w-6 rounded-full bg-success-green text-white flex items-center justify-center text-sm font-bold shrink-0">4</span>
                                        Funds released to seller
                                    </li>
                                </ol>
                            </div>
                            <div className="bg-white dark:bg-card rounded-lg p-6 border">
                                <h3 className="font-bold text-lg mb-3">Your Protection</h3>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-success-green" />
                                        100% of funds held securely until delivery
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-success-green" />
                                        Full refund if vehicle doesn't arrive
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-success-green" />
                                        48-hour inspection window
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-success-green" />
                                        Dispute resolution support
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Verification Badges */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 rounded-full bg-electric-blue/10 flex items-center justify-center">
                            <FileCheck className="h-6 w-6 text-electric-blue" />
                        </div>
                        <h2 className="text-3xl font-bold">Verification Badges</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="p-6 text-center">
                            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mx-auto mb-4 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="font-bold mb-2">Verified Seller</h3>
                            <p className="text-sm text-muted-foreground">
                                Business license verified, minimum 10 successful sales, 4.5+ rating
                            </p>
                        </Card>
                        <Card className="p-6 text-center">
                            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 mx-auto mb-4 flex items-center justify-center">
                                <Shield className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="font-bold mb-2">Top Rated</h3>
                            <p className="text-sm text-muted-foreground">
                                50+ sales, 4.8+ rating, zero disputes in last 90 days
                            </p>
                        </Card>
                        <Card className="p-6 text-center">
                            <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mx-auto mb-4 flex items-center justify-center">
                                <Users className="h-8 w-8 text-yellow-600" />
                            </div>
                            <h3 className="font-bold mb-2">KYC Verified</h3>
                            <p className="text-sm text-muted-foreground">
                                Identity verified, linked bank account, phone verified
                            </p>
                        </Card>
                    </div>
                </section>

                {/* Fraud Prevention */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 rounded-full bg-error-red/10 flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-error-red" />
                        </div>
                        <h2 className="text-3xl font-bold">Fraud Prevention</h2>
                    </div>
                    <Card className="p-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-4">We Protect Against</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-error-red mt-0.5" />
                                        <div>
                                            <p className="font-medium">Shill Bidding</p>
                                            <p className="text-sm text-muted-foreground">AI monitors for artificial bid inflation</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-error-red mt-0.5" />
                                        <div>
                                            <p className="font-medium">Misrepresentation</p>
                                            <p className="text-sm text-muted-foreground">All vehicles inspected before listing</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-error-red mt-0.5" />
                                        <div>
                                            <p className="font-medium">Non-Delivery</p>
                                            <p className="text-sm text-muted-foreground">Escrow holds funds until confirmed</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-4">Stay Safe</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>✓ Never pay outside of Auto Auctions Africa platform</li>
                                    <li>✓ Check seller verification badges</li>
                                    <li>✓ Review vehicle inspection reports</li>
                                    <li>✓ Use our secure messaging system</li>
                                    <li>✓ Report suspicious activity immediately</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Dispute Resolution */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-12 w-12 rounded-full bg-trust-blue/10 flex items-center justify-center">
                            <Scale className="h-6 w-6 text-trust-blue" />
                        </div>
                        <h2 className="text-3xl font-bold">Dispute Resolution</h2>
                    </div>
                    <Card className="p-8">
                        <div className="grid md:grid-cols-4 gap-6 text-center">
                            <div>
                                <div className="text-3xl font-black text-trust-blue mb-2">24-48h</div>
                                <p className="text-sm text-muted-foreground">Initial response time</p>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-trust-blue mb-2">7 days</div>
                                <p className="text-sm text-muted-foreground">Average resolution</p>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-trust-blue mb-2">95%</div>
                                <p className="text-sm text-muted-foreground">Resolved amicably</p>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-trust-blue mb-2">100%</div>
                                <p className="text-sm text-muted-foreground">Cases reviewed</p>
                            </div>
                        </div>
                        <div className="mt-8 text-center">
                            <Button asChild>
                                <Link href="/disputes">File a Dispute</Link>
                            </Button>
                        </div>
                    </Card>
                </section>

                {/* Contact */}
                <section className="text-center">
                    <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                        <HeadphonesIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
                    <p className="text-muted-foreground mb-6">
                        Our trust & safety team is available 24/7 to assist you.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" asChild>
                            <Link href="/faq">View FAQ</Link>
                        </Button>
                        <Button asChild>
                            <Link href="mailto:safety@voltbid.africa">Contact Safety Team</Link>
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}

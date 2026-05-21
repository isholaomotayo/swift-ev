import {
	Anchor,
	ArrowRight,
	CheckCircle2,
	FileText,
	Gavel,
	Globe,
	MapPin,
	Shield,
	Truck,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
	FeaturedVehicles,
	type Vehicle,
} from "@/components/home/featured-vehicles";
import { AuctionPromoBanner } from "@/components/home/auction-promo-banner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { SITE_NAME } from "@/lib/constants";
import { getConvexClient } from "@/lib/convex-server";
import * as m from "@/src/paraglide/messages.js";

export const revalidate = 60;

function toFeaturedVehicle(raw: {
	_id: string;
	batteryCapacity?: number;
	estimatedRange?: number;
	[key: string]: unknown;
}): Vehicle {
	return {
		...raw,
		batteryCapacity: raw.batteryCapacity ?? 0,
		estimatedRange: raw.estimatedRange ?? 0,
	} as Vehicle;
}

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: `${SITE_NAME} - ${m.common_bid_win()} ${m.common_export()}`,
		description: m.common_direct_global_vehicle_exports_compete_for_quality_(),
	};
}

const trustItems = [
	{
		icon: Shield,
		label: m.common_escrow_protected(),
		accent: "text-brand-blue",
	},
	{
		icon: CheckCircle2,
		label: m.common_verified_inspections(),
		accent: "text-brand-success",
	},
	{
		icon: FileText,
		label: m.common_documentation_support(),
		accent: "text-brand-primary dark:text-slate-200",
	},
	{
		icon: Truck,
		label: m.common_doorstep_delivery_text(),
		accent: "text-brand-gold",
	},
	{
		icon: Gavel,
		label: m.common_transparent_rules(),
		accent: "text-brand-accent",
	},
] as const;

const journeySteps = [
	{
		step: "01",
		title: m.common_strategic_search(),
		desc: m.common_access_proprietary_filters_to_find_vehicles_that_m(),
		accent: "border-brand-blue bg-brand-blue/5",
		link: "/register",
		cta: m.common_start_searching(),
	},
	{
		step: "02",
		title: m.common_verified_bidding(),
		desc: m.common_our_escrow_system_keeps_your_deposit_safe_until_th(),
		accent: "border-brand-accent bg-brand-accent/5",
		link: "/auctions",
		cta: m.nav_live_bids(),
	},
	{
		step: "03",
		title: m.common_seamless_logistics(),
		desc: m.common_tracking_from_port_of_origin_to_your_city_we_handl(),
		accent: "border-brand-success bg-brand-success/5",
		link: "/how-it-works",
		cta: m.common_shipping_info(),
	},
] as const;

const services = [
	{ title: m.common_customs_clearance_title(), icon: Shield },
	{ title: m.common_direct_shipping_title(), icon: Truck },
	{ title: m.common_battery_health_certs_title(), icon: Zap },
	{ title: m.common_final_registration_title(), icon: FileText },
	{ title: m.common_insurance_coverage_title(), icon: CheckCircle2 },
	{ title: m.common_global_logistics_title(), icon: Globe },
] as const;

export default async function Home() {
	const convex = getConvexClient();

	let featuredVehicles: Vehicle[] = [];
	try {
		const raw = await convex.query(api.vehicles.getFeaturedVehicles, {});
		featuredVehicles = raw.map(toFeaturedVehicle);
	} catch (error) {
		console.error("Failed to fetch homepage data:", error);
	}

	return (
		<div className="flex min-h-screen flex-col bg-slate-50 text-foreground dark:bg-slate-950 overflow-x-hidden">
			<Header />
			<main className="flex-1">
				{/* Cinematic hero — real China export port photography */}
				<section className="relative min-h-[88vh] flex items-end overflow-hidden">
					<Image
						src="/images/home-hero-china-port.png"
						alt={m.common_global_export_logistics()}
						fill
						priority
						sizes="100vw"
						className="object-cover object-center scale-[1.02]"
					/>
					<div
						className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/25"
						aria-hidden
					/>
					<div
						className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/30"
						aria-hidden
					/>
					<div
						className="absolute inset-0 opacity-[0.07] mix-blend-overlay bg-[url('/images/grid-pattern.svg')] bg-repeat"
						aria-hidden
					/>

					<div className="container relative z-10 mx-auto px-4 md:px-6 pb-16 md:pb-24 pt-32 md:pt-40">
						<div className="max-w-3xl">
							<div className="flex flex-wrap items-center gap-3 mb-8">
								<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300/90 uppercase tracking-wider">
									<MapPin className="h-3.5 w-3.5 text-brand-gold" />
									{m.common_china_nigeria()}
								</span>
							</div>

							<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-[1.02]">
								{m.common_bid_win()}{" "}
								<span className="text-brand-gold">{m.common_export()}</span>
							</h1>

							<p className="text-lg md:text-xl text-slate-300/95 mb-10 leading-relaxed max-w-2xl font-medium">
								{m.common_global_trade_invisible()}
							</p>

							<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-14">
								<Button
									size="lg"
									className="h-14 px-8 text-base rounded-lg bg-brand-gold hover:bg-brand-gold/90 text-brand-primary font-bold shadow-lg shadow-brand-gold/20"
									asChild
								>
									<Link href="/register">{m.common_get_started()}</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="h-14 px-8 text-base rounded-lg border-2 border-white/30 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm font-semibold"
									asChild
								>
									<Link href="/vehicles">{m.common_explore_inventory()}</Link>
								</Button>
							</div>

							<div className="flex flex-wrap gap-6 text-slate-400">
								<div className="flex items-center gap-2">
									<Globe className="h-4 w-4 text-brand-gold" />
									<span className="text-xs font-bold uppercase tracking-wider">
										{m.common_global_reach()}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Shield className="h-4 w-4 text-brand-gold" />
									<span className="text-xs font-bold uppercase tracking-wider">
										{m.common_fully_insured()}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Anchor className="h-4 w-4 text-brand-gold" />
									<span className="text-xs font-bold uppercase tracking-wider">
										{m.common_global_export_logistics()}
									</span>
								</div>
							</div>
						</div>

						{/* Floating stats — grounded in real logistics scale */}
						<div className="mt-16 md:mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl">
							{[
								{ value: "4+", label: m.common_global_reach() },
								{ value: "100%", label: m.common_guaranteed_delivery() },
								{ value: "24/7", label: m.common_live_tracking() },
								{ value: "Escrow", label: m.common_escrow_protected() },
							].map((stat) => (
								<div
									key={stat.label}
									className="rounded-xl border border-white/15 bg-white/10 px-4 py-4 md:px-5 md:py-5 backdrop-blur-md"
								>
									<p className="text-2xl md:text-3xl font-black text-white tabular-nums">
										{stat.value}
									</p>
									<p className="text-[10px] md:text-xs text-slate-300 uppercase tracking-widest font-bold mt-1">
										{stat.label}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				<AuctionPromoBanner />

				{/* Trust bar */}
				<section className="relative z-20 -mt-6 md:-mt-10 mx-4 md:mx-auto md:max-w-[calc(100%-3rem)] lg:max-w-6xl">
					<div className="rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-xl shadow-slate-900/5 p-4 md:p-6">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
							{trustItems.map(({ icon: Icon, label, accent }) => (
								<div
									key={label}
									className="flex items-center gap-3 px-2 py-2 md:py-0 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 last:border-0"
								>
									<div className={`shrink-0 ${accent}`}>
										<Icon className="h-5 w-5" />
									</div>
									<span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200 leading-snug">
										{label}
									</span>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Featured auctions */}
				<section className="py-20 md:py-28">
					<div className="container mx-auto px-4 md:px-6">
						<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-14 md:mb-16">
							<div className="max-w-xl">
								<span className="inline-block text-brand-accent font-bold uppercase tracking-[0.25em] text-[10px] mb-4">
									{m.common_direct_from_inventory()}
								</span>
								<h2 className="text-3xl md:text-5xl font-black text-brand-primary dark:text-white tracking-tight">
									{m.common_featured_vehicles()}
								</h2>
								<p className="mt-4 text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
									{m.common_direct_global_vehicle_exports_compete_for_quality_()}
								</p>
							</div>
							<Button
								variant="outline"
								className="self-start lg:self-auto group h-12 px-6 border-2 border-brand-primary/20 text-brand-primary dark:text-brand-gold dark:border-brand-gold/30 font-bold hover:bg-brand-primary hover:text-white dark:hover:bg-brand-gold dark:hover:text-brand-primary transition-colors"
								asChild
							>
								<Link href="/vehicles" className="flex items-center gap-2">
									{m.common_full_inventory()}
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
								</Link>
							</Button>
						</div>

						<FeaturedVehicles vehicles={featuredVehicles} />
					</div>
				</section>

				{/* Export journey */}
				<section className="py-20 md:py-28 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
					<div className="container mx-auto px-4 md:px-6">
						<div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
							<h2 className="text-3xl md:text-5xl font-black text-brand-primary dark:text-white tracking-tight">
								{m.common_the_export_journey()}
							</h2>
							<p className="mt-5 text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
								{m.common_weve_simplified_international_car_buying_into_thre()}
							</p>
						</div>

						<div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
							<div
								className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700"
								aria-hidden
							/>
							{journeySteps.map((item) => (
								<article
									key={item.step}
									className={`relative flex flex-col rounded-2xl border-2 ${item.accent} p-8 md:p-10 bg-white dark:bg-slate-950 hover:shadow-lg transition-shadow duration-300`}
								>
									<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white font-black text-sm mb-6">
										{item.step}
									</span>
									<h3 className="text-xl md:text-2xl font-black text-brand-primary dark:text-white mb-3">
										{item.title}
									</h3>
									<p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed flex-1">
										{item.desc}
									</p>
									<Link
										href={item.link}
										className="inline-flex items-center text-sm font-bold uppercase tracking-widest text-brand-primary dark:text-brand-gold hover:gap-3 gap-2 transition-all"
									>
										{item.cta}
										<ArrowRight className="h-4 w-4" />
									</Link>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* End-to-end solutions */}
				<section className="relative py-20 md:py-28 bg-brand-primary text-white overflow-hidden">
					<div
						className="absolute inset-0 opacity-20 pointer-events-none"
						aria-hidden
					>
						<div className="absolute -right-20 top-0 w-96 h-96 rounded-full bg-brand-blue/30 blur-3xl" />
						<div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-brand-gold/20 blur-3xl" />
					</div>
					<div className="container relative mx-auto px-4 md:px-6">
						<div className="grid lg:grid-cols-[minmax(0,1fr)_1.4fr] gap-12 lg:gap-20 items-start">
							<div className="lg:sticky lg:top-28">
								<span className="text-brand-gold font-bold uppercase tracking-[0.2em] text-[10px]">
									{m.common_endtoend()}
								</span>
								<h2 className="text-3xl md:text-5xl font-black leading-tight mt-4 mb-6">
									{m.common_endtoend()}{" "}
									<span className="text-brand-gold">
										{m.common_solutions()}
									</span>
								</h2>
								<p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-md">
									{m.common_end_to_end_subheadline()}
								</p>
								<div className="flex gap-10">
									<div>
										<p className="text-4xl font-black">{m.common_100()}</p>
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-2">
											{m.common_guaranteed_delivery()}
										</p>
									</div>
									<div>
										<p className="text-4xl font-black">{m.common_247()}</p>
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-2">
											{m.common_live_tracking()}
										</p>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{services.map(({ title, icon: Icon }) => (
									<div
										key={title}
										className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5 md:p-6 hover:bg-white/10 hover:border-white/20 transition-colors"
									>
										<div className="shrink-0 p-3 rounded-lg bg-brand-gold/15 text-brand-gold group-hover:scale-105 transition-transform">
											<Icon className="h-5 w-5" />
										</div>
										<span className="font-semibold text-base md:text-lg leading-snug">
											{title}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}

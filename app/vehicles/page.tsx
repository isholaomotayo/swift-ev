import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VehiclesListClient } from "@/components/vehicles/vehicles-list-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Browse Vehicles | autoexports.live",
  description:
    "Browse our curated selection of vehicles from Chinese manufacturers. Filter by make, year, price, and more.",
  keywords: [
    "vehicles",
    "Car auction",
    "Nigeria",
    "BYD",
    "NIO",
    "XPeng",
    "vehicle listing",
    "auction platform",
  ],
  openGraph: {
    title: "Browse Vehicles | autoexports.live",
    description: "Browse our curated selection of vehicles.",
    type: "website",
  },
};

export default async function VehiclesPage() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // Fetch initial data server-side
  let initialFilterOptions: any = null;
  let initialVehicleData: any = null;

  try {
    [initialFilterOptions, initialVehicleData] = await Promise.all([
      convex.query(api.vehicles.getFilterOptions, {}),
      convex.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 20,
        sortBy: "newest",
      }),
    ]);
  } catch (error) {
    console.error("Failed to fetch vehicles page data:", error);
    // Continue with null data - client component will handle loading
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8 p-8 rounded-2xl bg-gradient-to-r from-card to-card/50 border border-border/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-electric-blue/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent relative z-10">
              Browse Vehicles
            </h1>
            <p className="text-muted-foreground text-lg relative z-10 max-w-2xl">
              Find your perfect vehicle from our curated selection of premium Chinese cars.
            </p>
          </div>

          <VehiclesListClient
            initialFilterOptions={initialFilterOptions}
            initialVehicleData={initialVehicleData}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

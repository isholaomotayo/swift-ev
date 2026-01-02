import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VehiclesListClient } from "@/components/vehicles/vehicles-list-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Browse Vehicles | VoltBid Africa",
  description:
    "Browse our curated selection of electric vehicles from Chinese manufacturers. Filter by make, year, price, battery health, and more.",
  keywords: [
    "electric vehicles",
    "EV auction",
    "Nigeria",
    "BYD",
    "NIO",
    "XPeng",
    "vehicle listing",
    "auction platform",
  ],
  openGraph: {
    title: "Browse Vehicles | VoltBid Africa",
    description: "Browse our curated selection of electric vehicles.",
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Browse Vehicles</h1>
            <p className="text-muted-foreground">
              Find your perfect electric vehicle from our curated selection
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

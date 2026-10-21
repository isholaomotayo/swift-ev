import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Vehicle",
  description: "Add a new vehicle to your inventory.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UploadVehicleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

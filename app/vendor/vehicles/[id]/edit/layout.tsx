import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Vehicle",
  description: "Update your vehicle details and specifications.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditVehicleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

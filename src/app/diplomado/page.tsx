import type { Metadata } from "next";
import { DiplomadoDashboard } from "@/features/dashboard/components/diplomado-dashboard";

export const metadata: Metadata = {
  title: "UDLA - Diplomados",
  description: "Dashboard de gestión call center - Diplomados",
};

export default function DiplomadoPage() {
  return <DiplomadoDashboard />;
}

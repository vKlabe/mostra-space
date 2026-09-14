import type { ReactNode } from "react";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import "./premio.css";
export default function PremioLayout({ children }: { children: ReactNode }) {
  return <div className="museum-page min-h-screen"><MuseumHeader />{children}<LegalFooter /></div>;
}

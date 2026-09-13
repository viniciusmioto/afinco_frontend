import { ArrowLeftRight, ChartColumnStacked, ChartNoAxesCombined, Landmark, Upload, type LucideIcon } from "lucide-react";

export interface NavigationItem {
  label: string;
  icon: LucideIcon;
  /** Null for sections that are not built yet; they render as disabled entries. */
  href: string | null;
}

export const navigation: readonly NavigationItem[] = [
  { label: "Overview", icon: ChartNoAxesCombined, href: "/overview" },
  { label: "Breakdown", icon: ChartColumnStacked, href: "/breakdown" },
  { label: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
  { label: "Import", icon: Upload, href: "/upload" },
  { label: "Accounts", icon: Landmark, href: null },
];

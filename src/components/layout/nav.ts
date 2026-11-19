import {
  Bell,
  CirclePlay,
  ClipboardList,
  House,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MapPin,
  Megaphone,
  Siren,
  Tent,
  UserCog,
  WavesHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  description: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL: Role[] = ["resident", "official", "rescue", "admin"];

export const NAV: NavSection[] = [
  {
    title: "Command centre",
    items: [
      { href: "/dashboard", label: "Government Dashboard", icon: LayoutDashboard, roles: ["official", "admin"], description: "City-wide emergency overview" },
      { href: "/risk-map", label: "AI Risk Heatmap", icon: Map, roles: ALL, description: "Flood-risk zones and explanations" },
      { href: "/rescue", label: "Rescue Management", icon: LifeBuoy, roles: ["official", "rescue", "admin"], description: "SOS triage and team assignment" },
      { href: "/shelters", label: "Shelter Management", icon: Tent, roles: ["official", "rescue", "admin"], description: "Relief centre capacity" },
      { href: "/alerts", label: "Alerts & Warnings", icon: Megaphone, roles: ["official", "admin"], description: "Issue and manage public alerts" },
    ],
  },
  {
    title: "Resident portal",
    items: [
      { href: "/resident", label: "Portal Home", icon: House, roles: ["resident"], description: "Help in one tap" },
      { href: "/resident/sos", label: "Emergency SOS", icon: Siren, roles: ["resident"], description: "Request rescue" },
      { href: "/resident/report", label: "Report Flooding", icon: WavesHorizontal, roles: ["resident"], description: "Report a flooded road" },
      { href: "/resident/alerts", label: "Disaster Alerts", icon: Bell, roles: ["resident"], description: "Active warnings" },
      { href: "/resident/shelters", label: "Nearby Shelters", icon: MapPin, roles: ["resident"], description: "Find relief centres" },
      { href: "/resident/track", label: "Track My SOS", icon: ClipboardList, roles: ["resident"], description: "Request status" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin", label: "Administration", icon: UserCog, roles: ["admin"], description: "Users, teams and data" },
      { href: "/demo", label: "Demo Guide", icon: CirclePlay, roles: ALL, description: "Guided judge walkthrough" },
    ],
  },
];

const FLAT = NAV.flatMap((s) => s.items);

/** Find the nav item that owns a pathname (longest matching prefix). */
export function navItemFor(pathname: string): NavItem | undefined {
  return FLAT.filter((i) => pathname === i.href || pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0];
}

export function routeAllowed(pathname: string, role: Role): boolean {
  const item = navItemFor(pathname);
  return item ? item.roles.includes(role) : true;
}

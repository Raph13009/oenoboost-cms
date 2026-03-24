"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Layers,
  Grape,
  Leaf,
  FlaskConical,
  BookOpen,
  Newspaper,
  ClipboardList,
  Users,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/auth-actions";

const SIDEBAR_RAIL = 64;
const SIDEBAR_EXPANDED = 224;
const SIDEBAR_PX = 12; // horizontal padding so icons are visually centered
const RAIL_WIDTH = 48; // icon rail when expanded
const RAIL_WIDTH_COLLAPSED = 40; // icon rail when collapsed (fits in 64 - 2*SIDEBAR_PX)
const LABEL_WIDTH = SIDEBAR_EXPANDED - 2 * SIDEBAR_PX - RAIL_WIDTH; // 152 (content area minus rail)

const nav = [
  { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    items: [
      { label: "Régions", href: "/admin/wine-regions", icon: MapPin },
      { label: "Sous-régions", href: "/admin/wine-subregions", icon: Layers },
      { label: "AOP", href: "/admin/appellations", icon: MapPin },
      { label: "Cépages", href: "/admin/grapes", icon: Grape },
      { label: "Sols", href: "/admin/soil-types", icon: Leaf },
      { label: "Vinification", href: "/admin/vinification-types", icon: FlaskConical },
    ],
  },
  {
    items: [
      { label: "Glossaire", href: "/admin/dictionary", icon: BookOpen },
      { label: "Actualités", href: "/admin/news", icon: Newspaper },
      { label: "Questions du quiz", href: "/admin/quiz", icon: ClipboardList },
    ],
  },
  {
    items: [
      { label: "Utilisateurs", href: "/admin/users", icon: Users },
      { label: "Abonnements", href: "/admin/subscriptions", icon: CreditCard },
    ],
  },
  { label: "Paramètres", href: "/admin/settings", icon: Settings },
] as const;

function NavLink({
  href,
  icon: Icon,
  children,
  active,
  labelWidth,
  railWidth,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  active: boolean;
  labelWidth: number;
  railWidth: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-full text-sm transition-colors ${
        active
          ? "bg-slate-100 text-slate-900 font-medium"
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
      }`}
    >
      {/* Rail : largeur adaptée collapsed/expanded pour centrage visuel */}
      <span
        className="flex h-8 shrink-0 items-center justify-center transition-[width] duration-200 ease-out"
        style={{ width: railWidth }}
      >
        <Icon className="h-4 w-4" />
      </span>
      {/* Labels : serrés contre l’icône (pl-2), padding droit quand ouvert */}
      <span
        className={`min-w-0 truncate whitespace-nowrap overflow-hidden transition-[width] duration-200 ease-out ${labelWidth > 0 ? "pl-2 pr-3" : ""} ${active ? "font-semibold" : ""}`}
        style={{ width: labelWidth }}
      >
        {children}
      </span>
    </Link>
  );
}

/** Une seule ligne qui part de la gauche et s’élargit avec le drawer (marges fixes). */
function SidebarDivider() {
  return (
    <div
      className="my-3 border-t border-slate-200 transition-[width] duration-200 ease-out"
      style={{ marginLeft: SIDEBAR_PX, marginRight: SIDEBAR_PX }}
      role="separator"
    />
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const labelWidth = expanded ? LABEL_WIDTH : 0;
  const railWidth = expanded ? RAIL_WIDTH : RAIL_WIDTH_COLLAPSED;

  return (
    <aside
      className="fixed left-0 top-12 bottom-0 z-10 flex flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 ease-out"
      style={{ width: expanded ? SIDEBAR_EXPANDED : SIDEBAR_RAIL }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ paddingLeft: SIDEBAR_PX, paddingRight: SIDEBAR_PX }}
      >
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3">
          <ul className="space-y-0.5">
            {nav.map((item, index) => {
              if ("items" in item) {
                return (
                  <li key={index}>
                    {index > 0 && <SidebarDivider />}
                    <ul className="space-y-0.5">
                      {item.items.map((sub) => (
                        <li key={sub.href}>
                          <NavLink
                            href={sub.href}
                            icon={sub.icon}
                            active={pathname === sub.href || pathname.startsWith(sub.href + "/")}
                            labelWidth={labelWidth}
                            railWidth={railWidth}
                          >
                            {sub.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  {index > 0 && <SidebarDivider />}
                  <NavLink
                    href={item.href}
                    icon={item.icon}
                    active={pathname === item.href || pathname.startsWith(item.href + "/")}
                    labelWidth={labelWidth}
                    railWidth={railWidth}
                  >
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 py-3">
          <SidebarDivider />
          <div className="flex items-center mt-2">
            <span className="shrink-0 transition-[width] duration-200 ease-out" style={{ width: railWidth }} />
            <span
              className={`min-w-0 truncate whitespace-nowrap overflow-hidden text-xs text-slate-500 transition-[width] duration-200 ease-out ${labelWidth > 0 ? "pl-2 pr-3" : ""}`}
              style={{ width: labelWidth }}
              title={userEmail}
            >
              {userEmail || "—"}
            </span>
          </div>
          <form action={logout} className="mt-0.5">
            <button
              type="submit"
              className="flex w-full items-center rounded-full text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            >
              <span
                className="flex h-8 shrink-0 items-center justify-center transition-[width] duration-200 ease-out"
                style={{ width: railWidth }}
              >
                <LogOut className="h-4 w-4" />
              </span>
              <span
                className={`min-w-0 truncate whitespace-nowrap overflow-hidden text-left transition-[width] duration-200 ease-out ${labelWidth > 0 ? "pl-2 pr-3" : ""}`}
                style={{ width: labelWidth }}
              >
                Déconnexion
              </span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

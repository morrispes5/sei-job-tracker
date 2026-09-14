import { BriefcaseBusiness, LayoutDashboard, LogOut, Plus } from "lucide-react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { AuthUser } from "@sei/shared";

import { useAuth } from "../auth/auth-provider";
import { cn } from "../lib/utils";
import { Button } from "./ui";

const navigation = [
  { to: "/" as const, label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/applications" as const,
    label: "Applications",
    icon: BriefcaseBusiness,
  },
];

export function AppShell({ user }: { user: AuthUser }) {
  const { logout } = useAuth();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div className="min-h-screen bg-[#090b10] text-[#f4f7fb]">
      <aside className="fixed inset-y-0 hidden w-68 flex-col border-r border-white/8 bg-[#0d1118] px-4 py-5 lg:flex">
        <Brand />
        <nav className="mt-10 space-y-1" aria-label="Navigasi utama">
          {navigation.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white",
                currentPath === to || (to !== "/" && currentPath.startsWith(to))
                  ? "bg-[#5b8cff]/12 text-[#b9ccff]"
                  : undefined,
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <Link
          to="/applications/new"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#5b8cff] px-4 text-sm font-semibold text-[#06132e] transition hover:bg-[#82a7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <Plus className="size-4" aria-hidden />
          Tambah application
        </Link>
        <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="truncate text-sm font-semibold text-white">
            {user.displayName}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
          <Button
            className="mt-3 w-full justify-start px-2"
            variant="ghost"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" aria-hidden />
            Keluar
          </Button>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#090b10]/90 px-5 backdrop-blur lg:hidden">
        <Brand compact />
        <Button
          variant="ghost"
          className="px-2"
          aria-label="Keluar"
          onClick={() => void logout()}
        >
          <LogOut className="size-4" />
        </Button>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-7 lg:ml-68 lg:px-10 lg:pb-10 lg:pt-10">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-white/8 bg-[#0d1118]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden"
        aria-label="Navigasi mobile"
      >
        {navigation.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-slate-500",
              currentPath === to || (to !== "/" && currentPath.startsWith(to))
                ? "text-[#b9ccff]"
                : undefined,
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <img alt="Sei" src="/sei-mark.svg" className="size-9" />
      <span
        className={cn(
          "font-semibold tracking-tight text-white",
          compact ? "text-base" : "text-lg",
        )}
      >
        Sei <span className="font-normal text-slate-500">Tracker</span>
      </span>
    </Link>
  );
}

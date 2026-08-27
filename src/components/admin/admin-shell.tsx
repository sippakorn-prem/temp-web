"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";

import {
  AppShell,
  AppShellBody,
  AppShellCollapseTrigger,
  AppShellDrawer,
  AppShellDrawerTrigger,
  AppShellMain,
  AppShellMobileHeader,
  AppShellSidebar,
  AppShellSidebarContent,
  AppShellSidebarFooter,
  AppShellSidebarHeader,
  Badge,
  useAppShell,
} from "@/components/ds";
import { Brand, SafeDealMark } from "@/components/brand";
import { UserAvatar } from "@/components/user-avatar";
import { Icon, type IconName } from "@/components/icon";
import { useOpenDisputes } from "@/hooks/use-disputes";
import { cn } from "@/lib/ds-utils";
import { maskEmail } from "@/lib/mask";

/**
 * The staff console chrome — a denser, operations-flavoured shell distinct from the customer app.
 * Only Disputes is live; the rest are shown disabled ("coming soon") so the console reads as a real
 * surface without pretending features exist. The real access wall is the backend (RequireAdmin); a
 * non-staff user simply sees the forbidden state on the page.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const { isLoaded, user } = useUser();
  const disputes = useOpenDisputes();
  const openCount = disputes.data?.length ?? 0;

  const account = {
    name: user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "",
    email: user?.primaryEmailAddress ? maskEmail(user.primaryEmailAddress.emailAddress) : "",
    image: user?.imageUrl,
    isLoaded,
  };

  return (
    <AppShell mode="viewport" breakpoint="lg" sidebarWidth="244px" collapsedWidth="70px">
      <AppShellSidebar className="gap-1 p-4">
        <Sidebar pathname={pathname} openCount={openCount} account={account} />
      </AppShellSidebar>

      <AppShellBody>
        <AppShellMobileHeader className="h-14 gap-3 border-b bg-card pr-3 pl-4">
          <Brand className="min-w-0 flex-1 text-base" />
          <span className="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
            {t("operations")}
          </span>
          <AppShellDrawerTrigger label={t("operations")} />
        </AppShellMobileHeader>

        <AppShellDrawer title={t("operations")} closeLabel={t("operations")} className="gap-1 p-4">
          <Brand className="min-h-9 pr-10 text-base text-sidebar-foreground" />
          <NavSections pathname={pathname} openCount={openCount} />
        </AppShellDrawer>

        <AppShellMain>
          <div className="mx-auto w-full max-w-[1180px] px-8 pt-6 pb-12 max-md:px-4 max-md:pt-4">
            {children}
          </div>
        </AppShellMain>
      </AppShellBody>
    </AppShell>
  );
}

interface AccountState {
  name: string;
  email: string;
  image?: string;
  isLoaded: boolean;
}

function Sidebar({
  pathname,
  openCount,
  account,
}: {
  pathname: string;
  openCount: number;
  account: AccountState;
}) {
  const t = useTranslations("admin.nav");
  const { collapsed } = useAppShell();

  return (
    <>
      <AppShellSidebarHeader className={cn("mb-3.5 min-h-[42px]", collapsed && "min-h-[76px] flex-col")}>
        {collapsed ? (
          <SafeDealMark className="mx-auto size-7 shrink-0 fill-brand" />
        ) : (
          <Brand className="min-w-0 flex-1 text-[17px] text-sidebar-foreground" />
        )}
        <AppShellCollapseTrigger
          expandLabel={t("operations")}
          collapseLabel={t("operations")}
          className="text-sidebar-muted hover:bg-sidebar-accent"
        />
      </AppShellSidebarHeader>

      <AppShellSidebarContent className="gap-1">
        <NavSections pathname={pathname} openCount={openCount} collapsed={collapsed} />
      </AppShellSidebarContent>

      <AppShellSidebarFooter className="gap-2 border-t border-sidebar-border pt-3">
        <Link
          href="/dashboard"
          className={cn(
            "flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-[12.5px] font-semibold text-sidebar-muted no-underline transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "justify-center px-0"
          )}
          aria-label={collapsed ? t("backToApp") : undefined}
        >
          <Icon name="home" className="size-[15px]" />
          {!collapsed ? <span>{t("backToApp")}</span> : null}
        </Link>
        {account.isLoaded && !collapsed ? (
          <div className="flex items-center gap-2.5 p-2">
            <UserAvatar name={account.name} src={account.image} size={36} ring="var(--sidebar)" />
            <span className="grid min-w-0 flex-1 gap-px">
              <span className="truncate text-[13px] font-semibold">{account.name}</span>
              <span className="truncate font-mono text-[11.5px] text-sidebar-muted">{account.email}</span>
            </span>
          </div>
        ) : null}
      </AppShellSidebarFooter>
    </>
  );
}

interface NavItem {
  icon: IconName;
  label: string;
  href?: string;
  active?: boolean;
  badge?: string;
}

function NavSections({
  pathname,
  openCount,
  collapsed = false,
}: {
  pathname: string;
  openCount: number;
  collapsed?: boolean;
}) {
  const t = useTranslations("admin.nav");
  const disputesActive = pathname.startsWith("/admin/disputes");

  const operations: NavItem[] = [
    {
      icon: "protection",
      label: t("disputes"),
      href: "/admin/disputes",
      active: disputesActive,
      badge: openCount > 0 ? String(openCount) : undefined,
    },
  ];
  const soon: NavItem[] = [
    { icon: "user", label: t("users") },
    { icon: "deals", label: t("deals") },
    { icon: "history", label: t("audit") },
    { icon: "home", label: t("kpis") },
  ];

  return (
    <>
      {!collapsed ? <SectionLabel>{t("operations")}</SectionLabel> : null}
      {operations.map((item) => (
        <NavLink key={item.label} item={item} collapsed={collapsed} />
      ))}
      {!collapsed ? <SectionLabel>{t("comingSoon")}</SectionLabel> : null}
      {soon.map((item) => (
        <NavLink key={item.label} item={item} collapsed={collapsed} />
      ))}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-1 px-2.5 text-[10px] font-bold tracking-[0.1em] text-[#718078] uppercase">
      {children}
    </div>
  );
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const t = useTranslations("admin.nav");
  const base =
    "relative flex min-h-[42px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold no-underline transition-colors before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full";

  if (!item.href) {
    // A not-yet-built section: visible but inert, with a coming-soon marker.
    return (
      <span
        className={cn(base, "cursor-default text-sidebar-muted/60", collapsed && "justify-center px-0")}
        aria-disabled
        title={t("comingSoon")}
      >
        <Icon name={item.icon} className="size-[17px]" />
        {!collapsed ? (
          <>
            <span>{item.label}</span>
            <Badge variant="terminal" className="ml-auto px-[7px] py-[2px] text-[10px]">
              {t("comingSoon")}
            </Badge>
          </>
        ) : null}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        base,
        "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
        item.active && "bg-sidebar-accent text-sidebar-accent-foreground before:bg-brand",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon name={item.icon} className="size-[17px]" />
      {!collapsed ? <span>{item.label}</span> : null}
      {item.badge ? (
        <Badge
          variant="warning"
          className={cn(
            "ml-auto px-[7px] py-[2px] text-[11px] font-semibold",
            collapsed && "absolute -top-1 -right-1 ml-0 min-w-4 px-1"
          )}
        >
          {item.badge}
        </Badge>
      ) : null}
    </Link>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { ChevronDownIcon, ChevronRightIcon, type LucideIcon } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
  Button,
  Skeleton,
  useAppShell,
} from "@/components/ds";
import { Brand, SafeDealMark } from "@/components/brand";
import { AccountMenu } from "@/components/account-menu";
import { UserAvatar } from "@/components/user-avatar";
import { Icon, icons } from "@/components/icon";
import { useDeals } from "@/hooks/use-deals";
import { needsAction } from "@/lib/domain/deal";
import { cn } from "@/lib/ds-utils";
import { maskEmail } from "@/lib/mask";

/**
 * The signed-in chrome.
 *
 * Product adapter around the design system's shell mechanics. SafeDeal owns all navigation,
 * identity, routing, badges and translated content; the package owns responsive shell state.
 */

interface NavEntry {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Matches this route and everything under it. */
  match: (pathname: string) => boolean;
  /** Count shown as an amber pill; `"!"` for "something here needs attention". */
  badge?: string;
  badgeLabel?: string;
}

export function AppLayout({
  toolbar,
  hideSetupNotice = false,
  children,
}: {
  toolbar?: React.ReactNode;
  /**
   * Set by a page that already tells the user to finish verifying — the dashboard's setup
   * checklist covers the same ground, and two nags on one screen read as a broken app.
   */
  hideSetupNotice?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("chrome");
  const tNav = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const { isLoaded, user } = useUser();
  const deals = useDeals();

  const emailVerified = user?.primaryEmailAddress?.verification.status === "verified";
  const phoneVerified = user?.primaryPhoneNumber?.verification.status === "verified";
  const unverified = isLoaded && !!user && !(emailVerified && phoneVerified);

  const waiting = (deals.data ?? []).filter(needsAction).length;

  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const email = user?.primaryEmailAddress
    ? maskEmail(user.primaryEmailAddress.emailAddress)
    : "";

  const nav: NavEntry[] = [
    {
      id: "dashboard",
      href: "/dashboard",
      label: tNav("dashboard"),
      icon: icons.home,
      match: (p) => p === "/dashboard",
    },
    {
      id: "deals",
      href: "/deals",
      label: tNav("deals"),
      icon: icons.deals,
      match: (p) => p.startsWith("/deals"),
      badge: waiting > 0 ? String(waiting) : undefined,
      badgeLabel: t("actionRequired"),
    },
    {
      id: "account",
      href: "/account",
      label: tNav("account"),
      icon: icons.user,
      match: (p) =>
        p.startsWith("/account") ||
        p.startsWith("/verify") ||
        p.startsWith("/onboarding/payout"),
      badge: unverified ? "!" : undefined,
      badgeLabel: t("actionRequired"),
    },
  ];

  const account = { name, email, image: user?.imageUrl, unverified, isLoaded };

  return (
    <AppShell mode="viewport" breakpoint="lg" sidebarWidth="244px" collapsedWidth="70px">
      <AppShellSidebar className="gap-1 p-4">
        <DesktopSidebar nav={nav} pathname={pathname} account={account} />
      </AppShellSidebar>

      <AppShellBody>
        <AppShellMobileHeader className="h-14 gap-3 border-b bg-card pr-3 pl-4">
          <Brand className="min-w-0 flex-1 text-base" />
          {account.isLoaded ? (
            <AccountMenu side="bottom" align="end" unverified={unverified}>
              <button
                type="button"
                aria-label={t("accountMenu")}
                className="shrink-0 cursor-pointer rounded-full"
              >
                <UserAvatar
                  name={name}
                  src={user?.imageUrl}
                  size={36}
                  pip={unverified}
                  pipLabel={t("notVerified")}
                  ring="var(--card)"
                />
              </button>
            </AccountMenu>
          ) : (
            <Skeleton className="size-9 shrink-0 rounded-full" />
          )}
          <AppShellDrawerTrigger label={t("openNavigation")} />
        </AppShellMobileHeader>

        <AppShellDrawer
          title={t("menu")}
          closeLabel={t("closeNavigation")}
          className="gap-1 p-4"
        >
          <Brand className="min-h-9 pr-10 text-base text-sidebar-foreground" />
          <NavLabel>{t("menu")}</NavLabel>
          <DrawerNavLinks nav={nav} pathname={pathname} />
          <DrawerAccount account={account} />
        </AppShellDrawer>

        <AppShellMain>
          {/* The content column is what's capped — wide enough for the deal list, narrow
              enough that a row's title and amount don't end up a monitor apart. */}
          <div className="mx-auto w-full max-w-[1280px] px-10 pt-7 pb-11 max-md:px-4 max-md:pt-4.5 max-md:pb-6">
            {toolbar ? (
              <div className="flex items-start justify-between gap-5 max-md:flex-col">
                {toolbar}
              </div>
            ) : null}
            {unverified && !hideSetupNotice ? <VerificationNotice /> : null}
            {children}
          </div>
        </AppShellMain>
      </AppShellBody>
    </AppShell>
  );
}

function DesktopSidebar({
  nav,
  pathname,
  account,
}: {
  nav: NavEntry[];
  pathname: string;
  account: AccountState;
}) {
  const t = useTranslations("chrome");
  const { collapsed } = useAppShell();

  return (
    <>
      <AppShellSidebarHeader
        className={cn("mb-3.5 min-h-[42px]", collapsed && "min-h-[76px] flex-col")}
      >
        {collapsed ? (
          <SafeDealMark className="mx-auto size-7 shrink-0 fill-brand" />
        ) : (
          <Brand className="min-w-0 flex-1 text-[17px] text-sidebar-foreground" />
        )}
        <AppShellCollapseTrigger
          expandLabel={t("expandNavigation")}
          collapseLabel={t("collapseNavigation")}
          className="text-sidebar-muted hover:bg-sidebar-accent"
        />
      </AppShellSidebarHeader>
      <AppShellSidebarContent className="gap-1">
        {!collapsed ? <NavLabel>{t("menu")}</NavLabel> : null}
        <NavLinks nav={nav} pathname={pathname} collapsed={collapsed} />
      </AppShellSidebarContent>
      <AppShellSidebarFooter className="border-t border-sidebar-border pt-3">
        <DesktopAccount account={account} collapsed={collapsed} />
      </AppShellSidebarFooter>
    </>
  );
}

interface AccountState {
  name: string;
  email: string;
  image?: string;
  unverified: boolean;
  isLoaded: boolean;
}

function DesktopAccount({ account, collapsed }: { account: AccountState; collapsed: boolean }) {
  const t = useTranslations("chrome");
  if (!account.isLoaded) return <AccountSkeleton collapsed={collapsed} />;
  return (
    <AccountMenu side="top" align="start" unverified={account.unverified}>
      <button
        type="button"
        aria-label={collapsed ? t("accountMenu") : undefined}
        className={cn(
          "group flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent",
          collapsed && "justify-center p-0"
        )}
      >
        <UserAvatar
          name={account.name}
          src={account.image}
          size={40}
          pip={account.unverified}
          pipLabel={t("notVerified")}
          ring="var(--sidebar)"
        />
        {!collapsed ? (
          <>
            <span className="grid min-w-0 flex-1 gap-px">
              <span className="truncate text-[13px] font-semibold">{account.name}</span>
              <span className="truncate font-mono text-[11.5px] text-sidebar-muted">
                {account.email}
              </span>
            </span>
            <ChevronIndicator />
          </>
        ) : null}
      </button>
    </AccountMenu>
  );
}

function DrawerAccount({ account }: { account: AccountState }) {
  const t = useTranslations("chrome");
  return (
    <div className="mt-auto border-t border-sidebar-border pt-3">
      {account.isLoaded ? (
        <div className="flex items-center gap-2.5 p-2">
          <UserAvatar
            name={account.name}
            src={account.image}
            size={38}
            pip={account.unverified}
            pipLabel={t("notVerified")}
            ring="var(--sidebar)"
          />
          <span className="grid min-w-0 flex-1 gap-px">
            <span className="truncate text-[13px] font-semibold">{account.name}</span>
            <span className="truncate font-mono text-[11.5px] text-sidebar-muted">
              {account.email}
            </span>
          </span>
        </div>
      ) : (
        <AccountSkeleton />
      )}
    </div>
  );
}

function DrawerNavLinks({ nav, pathname }: { nav: NavEntry[]; pathname: string }) {
  const { setDrawerOpen } = useAppShell();
  return <NavLinks nav={nav} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />;
}

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-1 px-2.5 text-[10px] font-bold tracking-[0.1em] text-[#718078] uppercase">
      {children}
    </div>
  );
}

function NavLinks({
  nav,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  nav: NavEntry[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <>
      {nav.map(({ id, href, label, icon: Icon, match, badge, badgeLabel }) => {
        const active = match(pathname);
        return (
          <Link
            key={id}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(
              "relative flex min-h-[42px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold text-sidebar-muted no-underline transition-colors before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full hover:bg-sidebar-accent hover:text-sidebar-foreground",
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground before:bg-brand",
              collapsed && "justify-center px-0"
            )}
          >
            <Icon className="size-[17px]" />
            {!collapsed ? <span>{label}</span> : null}
            {badge ? (
              <Badge
                variant="warning"
                aria-label={badgeLabel}
                className={cn(
                  "ml-auto px-[7px] py-[2px] text-[11px] font-semibold",
                  collapsed && "absolute -top-1 -right-1 ml-0 min-w-4 px-1"
                )}
              >
                {badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}

/**
 * Points along the axis the menu will open on: right while closed, down while open.
 * Radix stamps `data-state` on the trigger, so the arrow follows the menu with no state
 * of its own.
 */
function ChevronIndicator() {
  return (
    <span className="grid shrink-0 text-[#71807a]" aria-hidden>
      <ChevronRightIcon className="size-4 group-data-[state=open]:hidden" />
      <ChevronDownIcon className="hidden size-4 group-data-[state=open]:block" />
    </span>
  );
}

/**
 * Holds the footer's exact shape while Clerk resolves the session, so the sidebar doesn't
 * jump when the user's name arrives — the one place a layout shift would be most visible,
 * because it's pinned to the bottom edge.
 */
function AccountSkeleton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 p-2", collapsed && "justify-center p-0")}>
      <Skeleton className="size-10 shrink-0 rounded-full" />
      {!collapsed ? (
        <div className="grid min-w-0 flex-1 gap-[7px]">
          <Skeleton className="h-[11px] w-[70%]" />
          <Skeleton className="h-2.5 w-[90%]" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Unverified email or phone blocks payouts, so it's a chrome-level fact rather than one
 * page's problem — it follows the user until it's fixed. Dismissal is per browser tab: it
 * shouldn't nag on every navigation, and it shouldn't be silenceable forever either.
 */
const DISMISS_KEY = "safedeal.verify-notice-dismissed";

function VerificationNotice() {
  const t = useTranslations("chrome");
  const pathname = usePathname();
  // `null` = not yet read from sessionStorage. Rendering nothing until then avoids showing
  // a banner the user already dismissed and then yanking it away a frame later.
  const [dismissed, setDismissed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  // Pointless on the screen that fixes it.
  if (pathname.startsWith("/verify") || dismissed !== false) return null;

  return (
    <div className="mt-5">
      <Alert variant="warning">
        <Icon name="warning" />
        <AlertTitle>{t("verifyTitle")}</AlertTitle>
        <AlertDescription>
          <p>{t("verifyBody")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/verify">{t("verifyNow")}</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem(DISMISS_KEY, "1");
                setDismissed(true);
              }}
            >
              {t("later")}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

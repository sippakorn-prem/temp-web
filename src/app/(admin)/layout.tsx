import * as React from "react";

import { SignedInBoundary } from "@/app/(signed-in)/signed-out-redirect";
import { AdminShell } from "@/components/admin/admin-shell";

/**
 * The staff console. Signed-out users are bounced to sign-in; the real admin wall is the backend
 * (RequireAdmin) — a signed-in non-staff user reaches the shell but sees the forbidden state, since
 * every admin data call fails closed with 403.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedInBoundary>
      <AdminShell>{children}</AdminShell>
    </SignedInBoundary>
  );
}

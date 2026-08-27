"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isProvisioning } from "@/lib/provisioning";

// A fresh account waits for its projection. Retry across ~30s of it, which covers webhook
// delivery comfortably; past that the screen says so rather than spinning forever.
const PROVISIONING_ATTEMPTS = 10;
const PROVISIONING_RETRY_MS = 3_000;

// One QueryClient per browser session. Created lazily inside state so a Suspense retry
// or a re-render never throws the cache away, and so the server never shares a client
// between requests.
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Deal state changes server-side (webhooks, worker jobs), so a stale screen is
            // worse than an extra request — but don't retry what the server already refused.
            retry: (failureCount, error) => {
              // The one 4xx worth retrying: the account is provisioning, so the same
              // request succeeds once our copy of the user lands.
              if (isProvisioning(error)) return failureCount < PROVISIONING_ATTEMPTS;
              const status = (error as { status?: number } | null)?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
            retryDelay: (failureCount, error) =>
              isProvisioning(error)
                ? PROVISIONING_RETRY_MS
                : Math.min(1000 * 2 ** failureCount, 30_000),
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

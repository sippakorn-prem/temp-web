"use client";

import * as React from "react";
import { RedirectToSignIn, Show } from "@clerk/nextjs";

/** Preserve the signed-out redirect for client-only pages; protected APIs still fail closed. */
export function SignedInBoundary({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}

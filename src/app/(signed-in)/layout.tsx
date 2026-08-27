import * as React from "react";
import { SignedInBoundary } from "./signed-out-redirect";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <SignedInBoundary>{children}</SignedInBoundary>;
}

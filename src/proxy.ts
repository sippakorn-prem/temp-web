import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isCredentialEntryPath } from "@/lib/auth-paths";

/**
 * Clerk still needs Proxy to attach request-scoped session context. Authorization lives at
 * the resource; this redirect only keeps signed-in users out of credential-entry screens.
 */
export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  if (userId && isCredentialEntryPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Expose the request path to the server tree. `src/i18n/request.ts` reads it to
  // resolve the locale from a `/en` or `/th` URL prefix (the marketing landing) so
  // those pages serve the right `<html lang>` and copy per-URL for SEO. Non-prefixed
  // app routes ignore it and fall back to the `locale` cookie.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};

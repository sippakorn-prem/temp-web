import { auth } from "@clerk/nextjs/server";
import { proxyAuthenticatedStream } from "@/lib/api/server-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { getToken } = await auth();
  return proxyAuthenticatedStream({
    path: `/v1/deals/${encodeURIComponent(code)}/events`,
    token: await getToken(),
    request,
  });
}

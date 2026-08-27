import { proxyRoute } from "@/lib/api/route-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return proxyRoute(request, `/v1/deal-invitations/${encodeURIComponent(code)}/accept`);
}

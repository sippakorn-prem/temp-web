import { proxyRoute } from "@/lib/api/route-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return proxyRoute(request, `/v1/deals/${encodeURIComponent(code)}/dispute`);
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return proxyRoute(request, `/v1/deals/${encodeURIComponent(code)}/dispute`);
}

import { proxyRoute } from "@/lib/api/route-proxy";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRoute(request, `/v1/disputes/${encodeURIComponent(id)}`);
}

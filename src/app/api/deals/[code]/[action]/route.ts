import { proxyRoute } from "@/lib/api/route-proxy";

const ACTIONS = new Set(["fund", "shipment", "receipt", "accept-item", "refund"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; action: string }> }
) {
  const { code, action } = await params;
  if (!ACTIONS.has(action)) {
    return Response.json(
      { error: { message: "Unsupported deal action" } },
      { status: 404, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  return proxyRoute(request, `/v1/deals/${encodeURIComponent(code)}/${action}`);
}

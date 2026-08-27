import { proxyRoute } from "@/lib/api/route-proxy";

const ACTIONS = new Set(["review", "resolve-buyer", "resolve-seller", "mark-refund-paid"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params;
  if (!ACTIONS.has(action)) {
    return Response.json(
      { error: { message: "Unsupported dispute action" } },
      { status: 404, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  return proxyRoute(request, `/v1/admin/disputes/${encodeURIComponent(id)}/${action}`);
}

import { proxyRoute } from "@/lib/api/route-proxy";

export async function GET(request: Request) {
  return proxyRoute(request, `/v1/admin/disputes`);
}

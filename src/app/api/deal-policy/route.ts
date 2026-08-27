import { proxyRoute } from "@/lib/api/route-proxy";

export function GET(request: Request) {
  return proxyRoute(request, "/v1/deal-policy");
}

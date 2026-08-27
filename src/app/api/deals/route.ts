import { proxyRoute } from "@/lib/api/route-proxy";

export function GET(request: Request) {
  const query = new URL(request.url).search;
  return proxyRoute(request, `/v1/deals${query}`);
}

export function POST(request: Request) {
  return proxyRoute(request, "/v1/deals");
}

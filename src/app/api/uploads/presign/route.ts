import { proxyRoute } from "@/lib/api/route-proxy";

export function POST(request: Request) {
  return proxyRoute(request, "/v1/uploads/presign");
}

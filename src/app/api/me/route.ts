import { auth } from "@clerk/nextjs/server";
import { proxyAuthenticated } from "@/lib/api/server-proxy";

export async function GET(request: Request) {
  const { getToken } = await auth();
  return proxyAuthenticated({ path: "/v1/me", token: await getToken(), request });
}

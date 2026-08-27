import { auth } from "@clerk/nextjs/server";
import { proxyAuthenticated } from "@/lib/api/server-proxy";

export async function POST(request: Request) {
  const { getToken } = await auth();
  return proxyAuthenticated({ path: "/v1/consents", token: await getToken(), request });
}

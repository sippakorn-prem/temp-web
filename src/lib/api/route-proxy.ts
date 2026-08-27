import { auth } from "@clerk/nextjs/server";
import { proxyAuthenticated } from "@/lib/api/server-proxy";

export async function proxyRoute(request: Request, path: string) {
  const { getToken } = await auth();
  return proxyAuthenticated({ path, token: await getToken(), request });
}

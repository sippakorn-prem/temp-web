import { auth } from "@clerk/nextjs/server";
import { DealDetail } from "@/components/deal/deal-detail";
import { AppLayout } from "@/components/app-layout";

/** `params` is a promise in this Next version — await it before use. */
export default async function DealPage({ params }: { params: Promise<{ code: string }> }) {
  await auth.protect();
  const { code } = await params;
  return <AppLayout><DealDetail code={code} /></AppLayout>;
}

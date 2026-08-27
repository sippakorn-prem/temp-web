import { apiFetch } from "@/lib/api/client";
import type { MediaInput } from "@/lib/api/deals";

const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadPrivateFiles(
  files: File[],
  purpose: "product" | "shipment" | "dispute",
  dealCode = ""
): Promise<MediaInput[]> {
  return Promise.all(files.map(async (file) => {
    if (!ALLOWED.has(file.type) || file.size < 1 || file.size > MAX_BYTES) {
      throw new Error("invalid_upload");
    }
    const prepared = await apiFetch<{ key: string; url: string }>("/api/uploads/presign", {
      method: "POST",
      body: { purpose, dealCode, filename: file.name, contentType: file.type, size: file.size },
    });
    const result = await fetch(prepared.url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!result.ok) throw new Error("upload_failed");
    return { key: prepared.key, contentType: file.type, size: file.size };
  }));
}

import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { createOptinUpload, deleteOptinUpload, optinUploadIdFromUrl } from "@/lib/store";
import { baseUrl } from "@/lib/telephony";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use a PNG, JPG or WebP image." }, { status: 415 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 413 });
  }

  // Replacing an existing upload? Clean the old one up first.
  const replaceUrl = typeof form?.get("replaces") === "string" ? (form.get("replaces") as string) : undefined;
  const oldId = optinUploadIdFromUrl(replaceUrl);
  if (oldId) await deleteOptinUpload(oldId).catch(() => {});

  const upload = await createOptinUpload({
    businessId: biz.id,
    contentType: file.type,
    data: bytes.toString("base64"),
  });

  // Public, unguessable link Twilio can fetch during review.
  const url = `${baseUrl()}/u/${upload.id}`;
  return NextResponse.json({ id: upload.id, url });
}

export async function DELETE(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url).searchParams.get("url") ?? undefined;
  const id = optinUploadIdFromUrl(url);
  if (id) await deleteOptinUpload(id).catch(() => {});
  return NextResponse.json({ ok: true });
}

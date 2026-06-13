import { NextRequest } from "next/server";
import { getOptinUpload } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Public, no-auth endpoint that serves a temporary opt-in proof image so the
 * carrier (Twilio) can fetch it during toll-free verification review. The
 * underlying row is deleted once verification is approved/rejected, after
 * which this returns 404.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const upload = await getOptinUpload(id);
  if (!upload) return new Response("Not found", { status: 404 });

  const body = Buffer.from(upload.data, "base64");
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": upload.contentType,
      "content-length": String(body.byteLength),
      "cache-control": "public, max-age=300",
    },
  });
}

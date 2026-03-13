import { NextRequest, NextResponse } from "next/server";
import { generateDownloadUrl } from "@/lib/oss";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    // Join the path segments and decode
    const key = decodeURIComponent(path.join("/"));

    // Generate signed URL for the file
    const signedUrl = await generateDownloadUrl(key);

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

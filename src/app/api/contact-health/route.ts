import { NextResponse } from "next/server";
import { EMAIL } from "@/data/contact";

export const dynamic = "force-dynamic";

export async function GET() {
  const resendKeyConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0
  );

  return NextResponse.json({
    resendKeyConfigured,
    recipient: EMAIL,
  });
}

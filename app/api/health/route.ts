import { NextResponse } from "next/server";
import { serviceStatus } from "@/lib/env";

export function GET() {
  const services = serviceStatus();
  return NextResponse.json({ ok: true, services });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDeliveryDataFromSheet } from "@/lib/google-sheets";
import { mockDeliveryData } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sheetRange = searchParams.get("range");
  const demo = searchParams.get("demo");

  // If demo parameter is present, return mock data immediately
  if (demo === "true") {
    return NextResponse.json({
      data: mockDeliveryData,
      source: "mock",
      message: "Using demo data as requested.",
    });
  }

  try {
    // Check if Google Sheets credentials are configured
    // Priority: query params (from localStorage) > env vars
    let sheetId = process.env.GOOGLE_SHEET_ID || searchParams.get("sheet_id");
    let serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || searchParams.get("private_key");
    let clientEmail = process.env.GOOGLE_CLIENT_EMAIL || searchParams.get("client_email");

    // Check if we have either full JSON credentials OR separate credentials
    let isValidKey = false;

    if (serviceAccountKey && sheetId) {
      // Try parsing as JSON first (full service account key)
      try {
        const parsed = JSON.parse(serviceAccountKey);
        isValidKey = parsed.type === "service_account" && parsed.private_key && parsed.client_email;
      } catch {
        // If not valid JSON, check if we have separate private key + client email
        // Check for various formats of private key header
        const hasPrivateKey = serviceAccountKey.includes("PRIVATE KEY") ||
                             serviceAccountKey.includes("-----BEGIN") ||
                             serviceAccountKey.includes("\\n");
        if (clientEmail && hasPrivateKey) {
          isValidKey = true;
        }
      }
    }

    if (!isValidKey) {
      // Return mock data if not configured
      return NextResponse.json({
        data: mockDeliveryData,
        source: "mock",
        message: "Using mock data. Configure GOOGLE_SERVICE_ACCOUNT_KEY (full JSON or private key), GOOGLE_SHEET_ID, and GOOGLE_CLIENT_EMAIL for real data.",
      });
    }

    const data = await getDeliveryDataFromSheet(sheetRange || undefined);

    return NextResponse.json({
      data,
      source: "google-sheets",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[v0] Error fetching delivery data:", error);

    // Fallback to mock data on error
    return NextResponse.json({
      data: mockDeliveryData,
      source: "mock",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

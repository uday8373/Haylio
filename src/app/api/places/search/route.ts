import { NextRequest, NextResponse } from "next/server";
import type { PlaceCandidate } from "@/lib/types";

/**
 * Search Google Business listings (Places API New — Text Search).
 * Returns up to 6 candidates with the profile fields we auto-fill at signup.
 * Without GOOGLE_PLACES_API_KEY, returns { configured: false } and the
 * signup UI offers manual entry only.
 */
export async function POST(req: NextRequest) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, results: [] });
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours.weekdayDescriptions,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 6 }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Places API error:", res.status, await res.text());
      return NextResponse.json({ error: "Google Places search failed" }, { status: 502 });
    }

    const data = await res.json();
    const results: PlaceCandidate[] = (data.places ?? []).map((p: {
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      websiteUri?: string;
      nationalPhoneNumber?: string;
      regularOpeningHours?: { weekdayDescriptions?: string[] };
      primaryTypeDisplayName?: { text?: string };
    }) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      website: p.websiteUri ?? "",
      phone: p.nationalPhoneNumber ?? "",
      hours: (p.regularOpeningHours?.weekdayDescriptions ?? []).join("; "),
      category: p.primaryTypeDisplayName?.text ?? "",
    }));

    return NextResponse.json({ configured: true, results });
  } catch (err) {
    console.error("Places API failed:", err);
    return NextResponse.json({ error: "Google Places search failed" }, { status: 502 });
  }
}

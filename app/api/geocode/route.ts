import { isAuthenticatedNextjs } from "@/lib/convexAuth";

type GeocodeResult = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

type GeocodeResponse = {
  status?: string;
  results?: GeocodeResult[];
};

export async function POST(request: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: "Sign in to locate your farm." }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Google Geocoding is not configured. Add GOOGLE_MAPS_API_KEY to .env.local." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send an address or map coordinates." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Send an address or map coordinates." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const parameters = new URLSearchParams({ key: apiKey });

  if (typeof input.address === "string" && input.address.trim().length >= 2 && input.address.length <= 200) {
    parameters.set("address", input.address.trim());
  } else if (
    typeof input.latitude === "number" &&
    Number.isFinite(input.latitude) &&
    input.latitude >= -90 &&
    input.latitude <= 90 &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.longitude) &&
    input.longitude >= -180 &&
    input.longitude <= 180
  ) {
    parameters.set("latlng", `${input.latitude},${input.longitude}`);
  } else {
    return Response.json({ error: "Enter a valid address or map location." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${parameters.toString()}`,
      { cache: "no-store" },
    );
  } catch {
    return Response.json({ error: "Google Geocoding could not be reached." }, { status: 502 });
  }
  if (!response.ok) {
    return Response.json({ error: "Google Geocoding could not be reached." }, { status: 502 });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return Response.json({ error: "Google Geocoding returned an invalid response." }, { status: 502 });
  }
  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "Google Geocoding returned an invalid response." }, { status: 502 });
  }
  const result = payload as GeocodeResponse;
  const firstResult = result.results?.[0];
  const latitude = firstResult?.geometry?.location?.lat;
  const longitude = firstResult?.geometry?.location?.lng;
  if (
    result.status !== "OK" ||
    !firstResult?.formatted_address ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    const noMatches = result.status === "ZERO_RESULTS";
    return Response.json(
      { error: noMatches ? "Google could not find that address." : "Google Geocoding rejected the request. Check the API key and Geocoding API access." },
      { status: noMatches ? 404 : 502 },
    );
  }

  return Response.json({
    address: firstResult.formatted_address,
    latitude,
    longitude,
  });
}

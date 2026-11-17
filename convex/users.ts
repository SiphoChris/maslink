import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";

export const createUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal("usernamePasskey"),
      profile: v.object({}),
    }),
  },
  returns: v.id("users"),
  handler: async (ctx) => {
    return await ctx.db.insert("users", {});
  },
});

export const getProfile = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      fullName: v.string(),
      farmName: v.string(),
      location: v.string(),
      latitude: v.union(v.number(), v.null()),
      longitude: v.union(v.number(), v.null()),
      showOnMap: v.boolean(),
      isComplete: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get("users", userId);
    if (user === null) return null;

    const fullName = user.fullName ?? "";
    const farmName = user.farmName ?? "";
    const location = user.location ?? "";
    const latitude = user.locationLat ?? null;
    const longitude = user.locationLng ?? null;
    return {
      fullName,
      farmName,
      location,
      latitude,
      longitude,
      showOnMap: user.showOnMap ?? false,
      isComplete: Boolean(
        fullName &&
          farmName &&
          location &&
          latitude !== null &&
          longitude !== null,
      ),
    };
  },
});

export const updateProfile = mutation({
  args: {
    fullName: v.string(),
    farmName: v.string(),
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    showOnMap: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");

    const fullName = args.fullName.trim();
    const farmName = args.farmName.trim();
    const location = args.location.trim();
    if (
      !fullName ||
      !farmName ||
      !location ||
      !Number.isFinite(args.latitude) ||
      args.latitude < -90 ||
      args.latitude > 90 ||
      !Number.isFinite(args.longitude) ||
      args.longitude < -180 ||
      args.longitude > 180
    ) {
      throw new Error("Enter valid farm details and choose a map location.");
    }

    await ctx.db.patch("users", userId, {
      fullName,
      farmName,
      location,
      locationLat: args.latitude,
      locationLng: args.longitude,
      showOnMap: args.showOnMap,
    });
    return null;
  },
});

export const findNearbyFarmers = query({
  args: { radiusKm: v.number() },
  returns: v.array(
    v.object({
      id: v.id("users"),
      farmName: v.string(),
      distanceKm: v.number(),
      latitude: v.number(),
      longitude: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");
    if (!Number.isFinite(args.radiusKm) || args.radiusKm < 1 || args.radiusKm > 250) {
      throw new Error("Choose a search radius from 1 to 250 km.");
    }

    const user = await ctx.db.get("users", userId);
    if (user?.locationLat === undefined || user.locationLng === undefined) {
      return [];
    }

    const userLatitude = user.locationLat;
    const userLongitude = user.locationLng;
    const latitudeDelta = args.radiusKm / 110.574;
    const candidates = await ctx.db
      .query("users")
      .withIndex("by_location_visibility_and_lat", (q) =>
        q
          .eq("showOnMap", true)
          .gte("locationLat", Math.max(-90, userLatitude - latitudeDelta))
          .lte("locationLat", Math.min(90, userLatitude + latitudeDelta)),
      )
      .take(1000);

    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const locatedCandidates = candidates.filter(
      (candidate): candidate is Doc<"users"> & {
        farmName: string;
        locationLat: number;
        locationLng: number;
      } =>
        candidate._id !== userId &&
        typeof candidate.locationLat === "number" &&
        Number.isFinite(candidate.locationLat) &&
        typeof candidate.locationLng === "number" &&
        Number.isFinite(candidate.locationLng) &&
        typeof candidate.farmName === "string" &&
        candidate.farmName.length > 0,
    );
    return locatedCandidates
      .map((candidate) => {
        const latitudeDifference = toRadians(candidate.locationLat - userLatitude);
        const longitudeDifference = toRadians(candidate.locationLng - userLongitude);
        const haversine =
          Math.sin(latitudeDifference / 2) ** 2 +
          Math.cos(toRadians(userLatitude)) *
            Math.cos(toRadians(candidate.locationLat)) *
            Math.sin(longitudeDifference / 2) ** 2;
        const a = Math.min(1, Math.max(0, haversine));
        const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return {
          id: candidate._id,
          farmName: candidate.farmName,
          distanceKm,
          latitude: Math.round(candidate.locationLat * 100) / 100,
          longitude: Math.round(candidate.locationLng * 100) / 100,
        };
      })
      .filter((candidate) => candidate.distanceKm <= args.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((candidate) => ({
        ...candidate,
        distanceKm: Math.round(candidate.distanceKm * 10) / 10,
      }));
  },
});

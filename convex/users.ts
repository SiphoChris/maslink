import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
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
    return {
      fullName,
      farmName,
      location,
      isComplete: Boolean(fullName && farmName && location),
    };
  },
});

export const updateProfile = mutation({
  args: {
    fullName: v.string(),
    farmName: v.string(),
    location: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");

    const fullName = args.fullName.trim();
    const farmName = args.farmName.trim();
    const location = args.location.trim();
    if (!fullName || !farmName || !location) {
      throw new Error("Name, farm name, and location are required.");
    }

    await ctx.db.patch("users", userId, { fullName, farmName, location });
    return null;
  },
});

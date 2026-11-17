import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";

export const listOrders = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("orders"),
      createdBy: v.id("users"),
      createdByFarmName: v.string(),
      crop: v.string(),
      quantityKg: v.number(),
      committedKg: v.number(),
      farmerCount: v.number(),
      pricePerKg: v.number(),
      deliveryLocation: v.string(),
      deadline: v.string(),
      notes: v.union(v.string(), v.null()),
      joinedByMeKg: v.number(),
      status: v.union(v.literal("open"), v.literal("filled")),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");

    const openOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(50);
    const contributions = await ctx.db
      .query("contributions")
      .withIndex("by_farmer", (q) => q.eq("farmerId", userId))
      .take(100);
    const ordersById = new Map(openOrders.map((order) => [order._id, order]));
    const contributedOrders = await Promise.all(
      contributions.map((contribution) => ctx.db.get("orders", contribution.orderId)),
    );
    for (const order of contributedOrders) {
      if (order?.status === "filled") ordersById.set(order._id, order);
    }
    const myContributions = new Map(
      contributions.map((contribution) => [
        contribution.orderId,
        contribution.quantityKg,
      ]),
    );

    return Array.from(ordersById.values()).map((order: Doc<"orders">) => ({
      id: order._id,
      createdBy: order.createdBy,
      createdByFarmName: order.createdByFarmName,
      crop: order.crop,
      quantityKg: order.quantityKg,
      committedKg: order.committedKg,
      farmerCount: order.farmerCount,
      pricePerKg: order.pricePerKg,
      deliveryLocation: order.deliveryLocation,
      deadline: order.deadline,
      notes: order.notes ?? null,
      joinedByMeKg: myContributions.get(order._id) ?? 0,
      status: order.status === "filled" ? "filled" as const : "open" as const,
    }));
  },
});

export const createOrder = mutation({
  args: {
    crop: v.string(),
    quantityKg: v.number(),
    pricePerKg: v.number(),
    deliveryLocation: v.string(),
    deadline: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");

    const user = await ctx.db.get("users", userId);
    if (!user?.farmName || !user.location) {
      throw new Error("Complete your farm profile before posting an order.");
    }
    if (
      !args.crop.trim() ||
      args.quantityKg <= 0 ||
      args.pricePerKg <= 0 ||
      !args.deliveryLocation.trim() ||
      !args.deadline
    ) {
      throw new Error("Enter valid order details and a quantity above zero.");
    }

    return await ctx.db.insert("orders", {
      createdBy: userId,
      createdByFarmName: user.farmName,
      crop: args.crop.trim(),
      quantityKg: args.quantityKg,
      committedKg: 0,
      farmerCount: 0,
      pricePerKg: args.pricePerKg,
      deliveryLocation: args.deliveryLocation.trim(),
      deadline: args.deadline,
      notes: args.notes?.trim() || undefined,
      status: "open",
    });
  },
});

export const joinOrder = mutation({
  args: {
    orderId: v.id("orders"),
    quantityKg: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");

    const user = await ctx.db.get("users", userId);
    if (!user?.farmName || !user.location) {
      throw new Error("Complete your farm profile before joining an order.");
    }

    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.status !== "open") {
      throw new Error("This order is no longer open.");
    }

    const existing = await ctx.db
      .query("contributions")
      .withIndex("by_order_and_farmer", (q) =>
        q.eq("orderId", args.orderId).eq("farmerId", userId),
      )
      .unique();
    if (existing !== null) {
      throw new Error("Your farm has already joined this order.");
    }

    const remainingKg = order.quantityKg - order.committedKg;
    if (args.quantityKg <= 0 || args.quantityKg > remainingKg) {
      throw new Error(`Enter a quantity from 0.1 to ${remainingKg} kg.`);
    }

    const committedKg = order.committedKg + args.quantityKg;
    await ctx.db.insert("contributions", {
      orderId: args.orderId,
      farmerId: userId,
      quantityKg: args.quantityKg,
    });
    await ctx.db.patch("orders", args.orderId, {
      committedKg,
      farmerCount: order.farmerCount + 1,
      status: committedKg >= order.quantityKg ? "filled" : "open",
    });
    return null;
  },
});

export const leaveOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");

    const order = await ctx.db.get("orders", args.orderId);
    if (order === null || order.status !== "open") {
      throw new Error("This order can no longer be changed.");
    }

    const contribution = await ctx.db
      .query("contributions")
      .withIndex("by_order_and_farmer", (q) =>
        q.eq("orderId", args.orderId).eq("farmerId", userId),
      )
      .unique();
    if (contribution === null) {
      throw new Error("Your farm has not joined this order.");
    }

    await ctx.db.delete(contribution._id);
    await ctx.db.patch("orders", args.orderId, {
      committedKg: Math.max(0, order.committedKg - contribution.quantityKg),
      farmerCount: Math.max(0, order.farmerCount - 1),
    });
    return null;
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    fullName: v.optional(v.string()),
    farmName: v.optional(v.string()),
    location: v.optional(v.string()),
  }),
  orders: defineTable({
    createdBy: v.id("users"),
    createdByFarmName: v.string(),
    crop: v.string(),
    quantityKg: v.number(),
    committedKg: v.number(),
    farmerCount: v.number(),
    pricePerKg: v.number(),
    deliveryLocation: v.string(),
    deadline: v.string(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("filled"),
      v.literal("cancelled"),
    ),
  }).index("by_status", ["status"]),
  contributions: defineTable({
    orderId: v.id("orders"),
    farmerId: v.id("users"),
    quantityKg: v.number(),
  })
    .index("by_farmer", ["farmerId"])
    .index("by_order_and_farmer", ["orderId", "farmerId"]),
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
});

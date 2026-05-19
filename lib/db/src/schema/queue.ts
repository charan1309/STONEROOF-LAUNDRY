import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const queueTable = pgTable("queue", {
  id: text("id").primaryKey(),
  userName: text("user_name").notNull(),
  userRoom: text("user_room").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQueueSchema = createInsertSchema(queueTable).omit({ joinedAt: true });
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type QueueEntry = typeof queueTable.$inferSelect;

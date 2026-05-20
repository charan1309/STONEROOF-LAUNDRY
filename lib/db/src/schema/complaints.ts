import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
  userRoom: text("user_room").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;

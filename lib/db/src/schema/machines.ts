import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const machinesTable = pgTable("machines", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("available"),
  currentUserName: text("current_user_name"),
  currentUserRoom: text("current_user_room"),
  sessionEndTime: timestamp("session_end_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
});

export const insertMachineSchema = createInsertSchema(machinesTable).omit({});
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machinesTable.$inferSelect;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, machinesTable } from "@workspace/db";
import {
  GetMachineParams,
  UpdateMachineParams,
  UpdateMachineBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/machines", async (_req, res): Promise<void> => {
  const machines = await db.select().from(machinesTable).orderBy(machinesTable.id);
  res.json(machines);
});

router.get("/machines/summary", async (_req, res): Promise<void> => {
  const machines = await db.select().from(machinesTable);
  const summary = {
    total: machines.length,
    available: machines.filter((m) => m.status === "available").length,
    inUse: machines.filter((m) => m.status === "in_use").length,
    broken: machines.filter((m) => m.status === "broken").length,
  };
  res.json(summary);
});

router.get("/machines/:id", async (req, res): Promise<void> => {
  const params = GetMachineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [machine] = await db
    .select()
    .from(machinesTable)
    .where(eq(machinesTable.id, params.data.id));

  if (!machine) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }

  res.json(machine);
});

router.patch("/machines/:id", async (req, res): Promise<void> => {
  const params = UpdateMachineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMachineBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.message }, "Invalid machine update body");
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Partial<typeof machinesTable.$inferInsert> = {};

  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.currentUserName !== undefined) updateData.currentUserName = body.data.currentUserName;
  if (body.data.currentUserRoom !== undefined) updateData.currentUserRoom = body.data.currentUserRoom;
  if (body.data.sessionEndTime !== undefined) {
    updateData.sessionEndTime = body.data.sessionEndTime ? new Date(body.data.sessionEndTime) : null;
  }
  if (body.data.durationMinutes !== undefined) updateData.durationMinutes = body.data.durationMinutes;

  const [machine] = await db
    .update(machinesTable)
    .set(updateData)
    .where(eq(machinesTable.id, params.data.id))
    .returning();

  if (!machine) {
    res.status(404).json({ error: "Machine not found" });
    return;
  }

  const result = {
    ...machine,
    sessionEndTime: machine.sessionEndTime ? machine.sessionEndTime.toISOString() : null,
  };

  res.json(result);
});

export default router;

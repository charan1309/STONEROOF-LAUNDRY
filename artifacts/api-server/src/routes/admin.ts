import { Router, type IRouter } from "express";
import { db, machinesTable, queueTable } from "@workspace/db";
import { AdminResetMachinesBody, AdminClearQueueBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_CODE = process.env.ADMIN_CODE ?? "PGADMIN@2024";

router.post("/admin/reset-machines", async (req, res): Promise<void> => {
  const body = AdminResetMachinesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.adminCode !== ADMIN_CODE) {
    res.status(403).json({ error: "Invalid admin code." });
    return;
  }

  await db.update(machinesTable).set({
    status: "available",
    currentUserName: null,
    currentUserRoom: null,
    sessionEndTime: null,
    durationMinutes: null,
  });

  res.json({ success: true, message: "All machines reset to available." });
});

router.post("/admin/clear-queue", async (req, res): Promise<void> => {
  const body = AdminClearQueueBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.adminCode !== ADMIN_CODE) {
    res.status(403).json({ error: "Invalid admin code." });
    return;
  }

  await db.delete(queueTable);

  res.json({ success: true, message: "Waiting queue cleared." });
});

export default router;

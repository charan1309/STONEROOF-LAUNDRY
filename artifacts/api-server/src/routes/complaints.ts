import { Router } from "express";
import { db, complaintsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const ADMIN_CODE = process.env.ADMIN_CODE ?? "PGADMIN@2024";

const router = Router();

router.post("/complaints", async (req, res): Promise<void> => {
  const { userName, userRoom, message } = req.body;
  if (!userName || !userRoom || !message?.trim()) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }
  const [complaint] = await db
    .insert(complaintsTable)
    .values({ userName, userRoom, message: message.trim() })
    .returning();
  res.status(201).json(complaint);
});

router.get("/admin/complaints", async (_req, res): Promise<void> => {
  const complaints = await db
    .select()
    .from(complaintsTable)
    .orderBy(desc(complaintsTable.createdAt));
  res.json(complaints);
});

router.post("/admin/complaints/clear-all", async (req, res): Promise<void> => {
  const { adminCode } = req.body;
  if (adminCode !== ADMIN_CODE) {
    res.status(403).json({ error: "Invalid admin code." });
    return;
  }
  await db.delete(complaintsTable);
  res.json({ success: true, message: "All complaints cleared." });
});

router.delete("/admin/complaints/:id", async (req, res): Promise<void> => {
  const { adminCode } = req.body;
  if (adminCode !== ADMIN_CODE) {
    res.status(403).json({ error: "Invalid admin code." });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }
  await db.delete(complaintsTable).where(eq(complaintsTable.id, id));
  res.json({ success: true, message: "Complaint deleted." });
});

export default router;

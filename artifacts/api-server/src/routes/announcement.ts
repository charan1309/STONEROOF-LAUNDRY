import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { SetAnnouncementBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ADMIN_CODE = process.env.ADMIN_CODE ?? "PGADMIN@2024";

router.get("/announcement", async (_req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(announcementsTable)
    .where(eq(announcementsTable.isActive, true))
    .orderBy(announcementsTable.createdAt)
    .limit(1);

  if (!row) {
    res.json({ message: null, isActive: false });
    return;
  }

  res.json({ message: row.message, isActive: row.isActive });
});

router.put("/announcement", async (req, res): Promise<void> => {
  const body = SetAnnouncementBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.adminCode !== ADMIN_CODE) {
    res.status(403).json({ error: "Invalid admin code." });
    return;
  }

  const message = body.data.message?.trim() || null;

  await db.delete(announcementsTable);

  if (message) {
    await db.insert(announcementsTable).values({ message, isActive: true });
    res.json({ message, isActive: true });
  } else {
    res.json({ message: null, isActive: false });
  }
});

export default router;

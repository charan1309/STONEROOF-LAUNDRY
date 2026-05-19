import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, queueTable } from "@workspace/db";
import { JoinQueueBody, LeaveQueueParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/queue", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(queueTable)
    .orderBy(asc(queueTable.joinedAt));

  const result = entries.map((entry, index) => ({
    id: entry.id,
    userName: entry.userName,
    userRoom: entry.userRoom,
    joinedAt: entry.joinedAt.toISOString(),
    position: index + 1,
  }));

  res.json(result);
});

router.post("/queue", async (req, res): Promise<void> => {
  const body = JoinQueueBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const id = randomUUID();

  const [entry] = await db
    .insert(queueTable)
    .values({
      id,
      userName: body.data.userName,
      userRoom: body.data.userRoom,
    })
    .returning();

  const allEntries = await db
    .select()
    .from(queueTable)
    .orderBy(asc(queueTable.joinedAt));

  const position = allEntries.findIndex((e) => e.id === entry.id) + 1;

  res.status(201).json({
    id: entry.id,
    userName: entry.userName,
    userRoom: entry.userRoom,
    joinedAt: entry.joinedAt.toISOString(),
    position,
  });
});

router.delete("/queue/:id", async (req, res): Promise<void> => {
  const params = LeaveQueueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(queueTable)
    .where(eq(queueTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Queue entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

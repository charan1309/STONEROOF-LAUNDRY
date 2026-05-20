import { Router, type IRouter } from "express";
import healthRouter from "./health";
import machinesRouter from "./machines";
import queueRouter from "./queue";
import announcementRouter from "./announcement";
import adminRouter from "./admin";
import complaintsRouter from "./complaints";

const router: IRouter = Router();

router.use(healthRouter);
router.use(machinesRouter);
router.use(queueRouter);
router.use(announcementRouter);
router.use(adminRouter);
router.use(complaintsRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import machinesRouter from "./machines";
import queueRouter from "./queue";

const router: IRouter = Router();

router.use(healthRouter);
router.use(machinesRouter);
router.use(queueRouter);

export default router;

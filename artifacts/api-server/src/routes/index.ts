import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pairsRouter from "./pairs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pairsRouter);

export default router;

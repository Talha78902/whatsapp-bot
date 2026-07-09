import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import customersRouter from "./customers";
import campaignsRouter from "./campaigns";
import templatesRouter from "./templates";
import conversationsRouter from "./conversations";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import settingsRouter from "./settings";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(customersRouter);
router.use(campaignsRouter);
router.use(templatesRouter);
router.use(conversationsRouter);
router.use(dashboardRouter);
router.use(analyticsRouter);
router.use(settingsRouter);
router.use(webhooksRouter);

export default router;

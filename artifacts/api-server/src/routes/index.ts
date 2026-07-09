import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import { router as authRouter } from "./auth.js";
import { router as customersRouter } from "./customers.js";
import { router as campaignsRouter } from "./campaigns.js";
import { router as templatesRouter } from "./templates.js";
import { router as conversationsRouter } from "./conversations.js";
import { router as dashboardRouter } from "./dashboard.js";
import { router as analyticsRouter } from "./analytics.js";
import { router as settingsRouter } from "./settings.js";
import { router as webhooksRouter } from "./webhooks.js";

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

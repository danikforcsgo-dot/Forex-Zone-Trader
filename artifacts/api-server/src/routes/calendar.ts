import { Router } from "express";
import { fetchCalendar } from "../lib/calendar";

const router = Router();

router.get("/calendar", async (_req, res) => {
  const events = await fetchCalendar();
  res.json(events);
});

export default router;

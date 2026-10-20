import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { chatRouter } from "./modules/chat/router.js";
import { sessionRouter } from "./modules/session/router.js";

const app = new Hono()
  .use("*", logger())
  .use(
    "*",
    cors({
      exposeHeaders: ["x-anvia-stream-protocol"],
    })
  )
  .get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }))
  .route("/api", chatRouter)
  .route("/api", sessionRouter)
  .onError((err, c) => {
    console.error("[api error]", err);
    return c.json({ error: err.message || "Internal Server Error" }, 500);
  });

const port = Number(process.env.PORT ?? 8000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`api listening on http://localhost:${port}`);
});

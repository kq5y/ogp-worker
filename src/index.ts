import { Hono } from "hono";

import { router as toolsRouter } from "./routes/tools";

const app = new Hono();

app.route("/tools", toolsRouter);

app.notFound((c) => {
  return c.text("Not Found", 404);
});

export default app;

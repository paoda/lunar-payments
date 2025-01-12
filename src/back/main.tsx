import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { Client, Environment } from "square";

import { unwrap } from "../util.ts";

const env = Deno.env.get;
const TOKEN = unwrap<string>(env("SQUARE_ACCESS_TOKEN"), "expected env var");
const NODE_ENV = unwrap<string>(env("NODE_ENV"), "expected env var ");
const DEFAULT_CURRENCY: string = "CAD";

const sq = new Client({
  bearerAuthCredentials: { accessToken: TOKEN },
  environment: (NODE_ENV === "production")
    ? Environment.Production
    : Environment.Sandbox,
});

const app = new Hono();

app.get("/", serveStatic({ root: "./src/front" }));

app.get("/test", (c) => {
  return c.html(
    <html>
    </html>,
  );
});

app.post("/payment/confirm", async (c) => {
  const { paymentsApi } = sq;

  try {
    const body = await c.req.json();
    const token: string = unwrap<string>(body.token, "expected square nonce");

    const { result, ...response } = await paymentsApi.createPayment({
      sourceId: token,
      amountMoney: { amount: BigInt(100), currency: DEFAULT_CURRENCY },
      idempotencyKey: crypto.randomUUID(),
    });

    // console.debug(result);

    return c.newResponse(null, 200);
  } catch (e) {
    console.error("Payment Failed:");
    console.error(e);

    return c.json({ error: e }, 500);
  }
});

Deno.serve(app.fetch);

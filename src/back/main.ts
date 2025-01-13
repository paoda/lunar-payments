import { Client, Environment } from "square";
import { serveDir, serveFile } from "@std/http";

import { Customer, Item, Order, price } from "../product.ts";
import { expect } from "../util.ts";

const root = new URLPattern({ pathname: "/" });
const payment = new URLPattern({ pathname: "/payment/confirm" });
const assets = new URLPattern({ pathname: "/assets/*" });

const env = Deno.env.get;
const TOKEN = expect<string>(env("SQUARE_ACCESS_TOKEN"), "envvar should exist");
const NODE_ENV = expect<string>(env("NODE_ENV"), "envvar should exist");
const DEFAULT_CURRENCY: string = "CAD";

const sq = new Client({
  bearerAuthCredentials: { accessToken: TOKEN },
  environment: (NODE_ENV === "production")
    ? Environment.Production
    : Environment.Sandbox,
});

const fetch = async (req: Request) => {
  const url = new URL(req.url);

  if (root.test(url)) return serveFile(req, "./dist/index.html");

  if (assets.test(url)) {
    return serveDir(req, { fsRoot: "./dist/assets", urlRoot: "assets" });
  }

  if (payment.test(url)) return await handlePayment(req);

  return new Response("Not Found", { status: 404 });
};

Deno.serve(fetch);

const handlePayment = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { "Allow": "POST" } });
  }

  const { paymentsApi } = sq;

  try {
    const body = await req.json();

    const token: string = expect<string>(body.token, "token should exist");

    const customer = body.customer as Customer;
    expect(customer.name, "customer.name should exist");
    expect(customer.email, "customer.email should exist");

    if (customer.name === "" || customer.email === "") {
      return new Response(null, { status: 400 });
    }

    const order = body.order as Order;
    expect(order.tanghulu, "order.tanghulu should exist");
    expect(order.dumpling, "order.dumpling should exist");

    const cost = BigInt(order.tanghulu) * price(Item.Tanghulu) +
      BigInt(order.dumpling) * price(Item.Dumpling);

    const { result, ...response } = await paymentsApi.createPayment({
      sourceId: token,
      amountMoney: { amount: cost, currency: DEFAULT_CURRENCY },
      idempotencyKey: crypto.randomUUID(),
    });

    console.debug(result);
    console.debug(customer);

    return new Response(null, { status: 200 });
  } catch (e) {
    console.error("Payment Failed:");
    console.error(e);

    return new Response(null, { status: 500 });
  }
};

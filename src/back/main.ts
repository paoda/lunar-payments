import { Client, Environment } from "square";
import { serveDir, serveFile } from "@std/http";
import { Database } from "@db/sqlite";

import {
  Customer,
  Item,
  Order,
  Payment,
  price,
  withSquareFee,
} from "../product.ts";
import { expect, unwrap } from "../util.ts";

const root = new URLPattern({ pathname: "/" });
const payment = new URLPattern({ pathname: "/payment/confirm" });
const assets = new URLPattern({ pathname: "/assets/*" });

const env = Deno.env.get;
const TOKEN = expect<string>(env("SQUARE_ACCESS_TOKEN"), "envvar should exist");
const NODE_ENV = expect<string>(env("NODE_ENV"), "envvar should exist");
const DEFAULT_CURRENCY: string = "CAD";

type SqliteId = { id: number };

const db = new Database("sqlite.db");

db.prepare(
  `
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      reach TEXT
    )
  `,
).run();

db.prepare(
  `
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanghulu INTEGER NOT NULL,
      dumpling INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    ) 
  `,
).run();

db.prepare(
  `
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      square_id TEXT NOT NULL,
      cost INTEGER NOT NULL,
      last_4 TEXT NOT NULL,     
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      order_id INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )
  `,
).run();

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

const handlePayment = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { "Allow": "POST" } });
  }

  const { paymentsApi } = sq;

  try {
    const body = await req.json();

    const token: string = expect<string>(body.token, "token should exist");

    const customer = body.customer as Customer;
    unwrap(customer.name);
    unwrap(customer.email);

    const order = body.order as Order;
    unwrap(order.tanghulu);
    unwrap(order.dumpling);

    if (customer.name === "" || customer.email === "") {
      return new Response(null, { status: 400 });
    }

    const cost = BigInt(order.tanghulu) * price(Item.Tanghulu) +
      BigInt(order.dumpling) * price(Item.Dumpling);

    const { result, ...response } = await paymentsApi.createPayment({
      sourceId: token,
      amountMoney: { amount: withSquareFee(cost), currency: DEFAULT_CURRENCY },
      idempotencyKey: crypto.randomUUID(),
    });

    if (response.statusCode !== 200) {
      throw new Error(
        `SDK gave invalid HTTP code: ${response.statusCode}`,
      );
    }

    const finalCost = expect(
      result.payment?.amountMoney?.amount,
      "square returns the final cost",
    );

    // Note: fine to assume this will be present
    // 'cause we only accept ccs via this api
    const last4 = expect(
      result.payment?.cardDetails?.card?.last4,
      "square provides last 4 digits of cc",
    );

    const squareId = unwrap(result.payment?.id);

    const payment: Payment = {
      square_id: squareId,
      cost: finalCost,
      last_4: last4,
    };

    let customerId = getCustomerId(customer);

    if (customerId == null) {
      // safe because we already checked to see if we had a duplicate email. If we did then
      // this code path does not execute
      const ret = db.prepare(
        "INSERT INTO customers (name, email, reach) VALUES (?, ?, ?) RETURNING id",
      ).get(customer.name, customer.email, customer.reach) as SqliteId;

      customerId = ret.id;
    }

    const order_ret = db.prepare(
      "INSERT INTO orders (tanghulu, dumpling, customer_id) VALUES (?, ?, ?) RETURNING id",
    ).get(order.tanghulu, order.dumpling, customerId) as SqliteId;

    const orderId = order_ret.id;

    db.prepare(
      `INSERT INTO payments (square_id, cost, last_4, order_id) VALUES (?, ?, ?, ?) RETURNING id`,
    ).run(
      payment.square_id,
      payment.cost,
      payment.last_4,
      orderId,
    );

    return new Response(null, { status: 200 });
  } catch (e) {
    console.error("Payment Failed:", e);

    return new Response(null, { status: 500 });
  }
};

const getCustomerId = (customer: Customer): number | null => {
  const ret = db.prepare("SELECT id FROM customers WHERE email = ?")
    .get(customer.email) as SqliteId | undefined;

  if (ret == null) return null;

  return ret.id;
};

Deno.serve(fetch);

/**
 * Integration test: the REAL order routes, validation, pricing and Order
 * schema, with only the database calls stubbed (Product.find / Order.create).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const mongoose = require("mongoose");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const Product = require("../models/Product");
const Order = require("../models/Order");

const id = () => new mongoose.Types.ObjectId();
const PIE = id(), ZOBO = id(), OFF = id(), LEG = id(), LEGD = id();
const catalog = [
  { _id: PIE,  name: "Meat Pie",  category: "Pastries", active: true,  options: [{ label: "Single Pastry", price: 5.5, units: 1 }, { label: "Grand Dozen", price: 66, units: 12 }] },
  { _id: ZOBO, name: "Zobo",      category: "Drinks",   active: true,  options: [{ label: "Bottle", price: 6.5, units: 1 }] },
  // Legacy products: `units` was never stored, pack size is only in the label
  { _id: LEG,  name: "Legacy Pie", category: "Pastries", active: true, options: [{ label: "Trio Collection", price: 16.5 }, { label: "Grand Dozen (Box of 12)", price: 66 }, { label: "3 pieces", price: 15 }, { label: "12 pieces", price: 60 }] },
  { _id: LEGD, name: "Legacy Drink", category: "Drinks", active: true, options: [{ label: "Regular Cup", price: 6.5 }] },
  { _id: OFF,  name: "Retired",   category: "Pastries", active: false, options: [{ label: "Single Pastry", price: 1, units: 1 }] },
];
Product.find = async (q) => catalog.filter((p) => q._id.$in.map(String).includes(String(p._id)));

let saved = null;
Order.create = async (data) => {
  const doc = new Order(data);
  await doc.validate();            // real schema validation
  doc.orderId = "ORD-TEST";
  saved = doc.toObject();
  return doc;
};

const orderRoutes = require("../routes/order.routes");
const errorHandler = require("../middlewares/errorMiddleware");

let server, base;
test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/orders", orderRoutes);
  app.use(errorHandler);
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api/orders`;
});
test.after(() => server.close());

const post = (path, body) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: await r.json() }));

const customer = { customerName: "Test", phone: "+44 7700 900000", email: "", address: "1 Road, London, E1 1AA", method: "Delivery" };
const pie = (n, opt = "Single Pastry") => ({ product: String(PIE), optionName: opt, quantity: n });
const zobo = (n) => ({ product: String(ZOBO), optionName: "Bottle", quantity: n });

test("quote: 31 pastries + 7 bottles -> £9.99 once, not doubled", async () => {
  const r = await post("/quote", { method: "Delivery", items: [pie(31), zobo(7)] });
  assert.equal(r.status, 200);
  assert.equal(r.body.quote.deliveryFee, 9.99);
  assert.equal(r.body.quote.deliveryTier, "large");
  assert.equal(r.body.quote.subtotal, 31 * 5.5 + 7 * 6.5);
});

test("create order: tampered price / fee / total in the body are ignored", async () => {
  const r = await post("/", {
    ...customer,
    items: [{ ...pie(2), price: 0.01 }],
    deliveryFee: 0, totalAmount: 0.01, paymentStatus: "Paid", isPaid: true,
  });
  assert.equal(r.status, 201);
  assert.equal(saved.items[0].price, 5.5);
  assert.equal(saved.subtotal, 11);
  assert.equal(saved.deliveryFee, 7.99);
  assert.equal(saved.deliveryTier, "standard");
  assert.equal(saved.totalAmount, 18.99);
  assert.equal(saved.paymentStatus, "Pending");
  assert.equal(saved.isPaid, false);
});

test("saved order snapshots tier, counts and per-item category/units", async () => {
  await post("/", { ...customer, items: [pie(2, "Grand Dozen"), pie(7), zobo(2)] });
  assert.equal(saved.pastryUnits, 31);
  assert.equal(saved.drinkUnits, 2);
  assert.equal(saved.deliveryFee, 9.99);
  assert.equal(saved.items[0].units, 12);
  assert.equal(saved.items[0].category, "Pastries");
});

test("pickup orders have no delivery charge", async () => {
  await post("/", { ...customer, method: "Pickup", address: "", items: [pie(40)] });
  assert.equal(saved.deliveryFee, 0);
  assert.equal(saved.deliveryTier, "pickup");
  assert.equal(saved.totalAmount, 220);
});

test("invalid quantities and unavailable products are rejected with 400", async () => {
  for (const q of [0, -3, 2.5, 101]) {
    const r = await post("/", { ...customer, items: [pie(q)] });
    assert.equal(r.status, 400, `quantity ${q}`);
  }
  assert.equal((await post("/", { ...customer, items: [{ product: String(OFF), optionName: "Single Pastry", quantity: 1 }] })).status, 400);
  assert.equal((await post("/", { ...customer, items: [{ product: "123", optionName: "x", quantity: 1 }] })).status, 400);
  assert.equal((await post("/", { ...customer, items: [] })).status, 400);
});

test("anonymous callers cannot use the admin manual-order path", async () => {
  const r = await post("/", { ...customer, items: [{ manual: true, name: "Free stuff", price: 0.01, quantity: 1 }] });
  assert.equal(r.status, 400);
});

test("quote endpoint: single-category baskets at and just above the limits", async () => {
  const q = async (items) => (await post("/quote", { method: "Delivery", items })).body.quote;
  assert.equal((await q([pie(30)])).deliveryFee, 7.99);
  assert.equal((await q([pie(31)])).deliveryFee, 9.99);
  assert.equal((await q([zobo(6)])).deliveryFee, 7.99);
  assert.equal((await q([zobo(7)])).deliveryFee, 9.99);
  assert.equal((await q([pie(20), zobo(4)])).deliveryFee, 7.99);
  assert.equal((await q([pie(31), zobo(2)])).deliveryFee, 9.99);
  assert.equal((await q([pie(10), zobo(7)])).deliveryFee, 9.99);
  assert.equal((await q([pie(30), zobo(6)])).deliveryFee, 7.99);
  assert.equal((await q([pie(31), zobo(7)])).deliveryFee, 9.99);
  // 12-packs count as 12 pieces: 2 dozen + 6 singles = 30 (standard), 7 singles = 31 (large)
  assert.equal((await q([pie(2, "Grand Dozen"), pie(6)])).deliveryFee, 7.99);
  assert.equal((await q([pie(2, "Grand Dozen"), pie(7)])).deliveryFee, 9.99);
});

test("create order saves the same fee the quote showed (31 pastries -> £9.99)", async () => {
  const items = [pie(31)];
  const quote = (await post("/quote", { method: "Delivery", items })).body.quote;
  await post("/", { ...customer, items });
  assert.equal(saved.deliveryFee, quote.deliveryFee);
  assert.equal(saved.totalAmount, quote.totalAmount);
  assert.equal(saved.deliveryTier, "large");
});

test("manual admin order path uses the same thresholds (service-level)", () => {
  const { calculateDelivery } = require("../utils/delivery");
  assert.equal(calculateDelivery({ method: "Delivery", pastryCount: 30, drinkCount: 0 }).fee, 7.99);
  assert.equal(calculateDelivery({ method: "Delivery", pastryCount: 31, drinkCount: 0 }).fee, 9.99);
  assert.equal(calculateDelivery({ method: "Delivery", pastryCount: 0, drinkCount: 7 }).fee, 9.99);
});

// ---- Pack sizes end to end (quote + saved order) when `units` is missing ----
const { DELIVERY_RULES } = require("../utils/delivery");
const leg = (n, opt) => ({ product: String(LEG), optionName: opt, quantity: n });
const legd = (n) => ({ product: String(LEGD), optionName: "Regular Cup", quantity: n });
const quote = (items) => post("/quote", { method: "Delivery", items }).then((r) => r.body.quote);

test("quote counts real pieces: 1x3=3, 1x12=12, 2x12=24, 5x3=15, 3x3=9", async () => {
  assert.equal((await quote([leg(1, "Trio Collection")])).pastryUnits, 3);
  assert.equal((await quote([leg(1, "Grand Dozen (Box of 12)")])).pastryUnits, 12);
  assert.equal((await quote([leg(2, "Grand Dozen (Box of 12)")])).pastryUnits, 24);
  assert.equal((await quote([leg(5, "Trio Collection")])).pastryUnits, 15);
  assert.equal((await quote([leg(3, "3 pieces")])).pastryUnits, 9);
  assert.equal((await quote([leg(2, "12 pieces")])).pastryUnits, 24);
});

test("pack sizes drive the fee at the real threshold, money counted once", async () => {
  const max = DELIVERY_RULES.maxPastriesStandard;                  // 30
  const atLimit = await quote([leg(max / 3, "Trio Collection")]);
  assert.equal(atLimit.pastryUnits, max);
  assert.equal(atLimit.deliveryTier, "standard");
  const over = await quote([leg(max / 3, "Trio Collection"), leg(1, "3 pieces")]);
  assert.equal(over.pastryUnits, max + 3);
  assert.equal(over.deliveryTier, "large");
  const two = await quote([leg(2, "Grand Dozen (Box of 12)")]);
  assert.equal(two.subtotal, 132);                                 // 2 x £66, not 24 x £66
  const mixed = await quote([leg(1, "Grand Dozen (Box of 12)"), legd(DELIVERY_RULES.maxDrinksStandard + 1)]);
  assert.equal(mixed.deliveryTier, "large");                       // drinks alone trigger it
  assert.equal(mixed.deliveryFee, 9.99);
});

test("saved order stores real pieces and per-line pack size", async () => {
  const r = await post("/", { ...customer, items: [leg(2, "Grand Dozen (Box of 12)"), legd(2)] });
  assert.equal(r.status, 201);
  assert.equal(saved.pastryUnits, 24);
  assert.equal(saved.drinkUnits, 2);
  assert.equal(saved.items[0].units, 12);
  assert.equal(saved.items[0].quantity, 2);
  assert.equal(saved.subtotal, 132 + 13);
});

// ---- Newry special delivery area, end to end ----
const NEWRY = "12 Hill Street, Newry, BT35 6DR";
const ELSEWHERE = "12 Hill Street, Belfast, BT1 1AA";
const quoteAt = (items, address, method = "Delivery") =>
  post("/quote", { method, address, items }).then((r) => r.body.quote);

test("quote: Newry address = £3.50, counts unchanged", async () => {
  const q = await quoteAt([leg(2, "Grand Dozen (Box of 12)"), legd(2)], NEWRY);
  assert.equal(q.deliveryFee, 3.5);
  assert.equal(q.deliveryTier, "newry");
  assert.equal(q.pastryUnits, 24);
  assert.equal(q.drinkUnits, 2);
  assert.equal(q.totalAmount, 132 + 13 + 3.5);
});

test("quote: Newry stays £3.50 even for a 'large' basket (never £9.99, never summed)", async () => {
  const q = await quoteAt([leg(4, "Grand Dozen (Box of 12)"), legd(10)], NEWRY);
  assert.equal(q.pastryUnits, 48);
  assert.equal(q.drinkUnits, 10);
  assert.equal(q.deliveryFee, 3.5);
});

test("quote: outside Newry keeps £7.99 / £9.99", async () => {
  assert.equal((await quoteAt([leg(1, "Trio Collection")], ELSEWHERE)).deliveryFee, 7.99);
  assert.equal((await quoteAt([leg(1, "Trio Collection")], undefined)).deliveryFee, 7.99);
  assert.equal((await quoteAt([leg(4, "Grand Dozen (Box of 12)")], ELSEWHERE)).deliveryFee, 9.99);   // 48 pastries
  assert.equal((await quoteAt([legd(7)], ELSEWHERE)).deliveryFee, 9.99);                              // 7 bottles
  assert.equal((await quoteAt([leg(1, "Trio Collection")], "Newry Road, Kilkeel, BT34 4AB")).deliveryFee, 7.99);
  assert.equal((await quoteAt([leg(1, "Trio Collection")], "12 Hill St, Newry, E1 1AA")).deliveryFee, 7.99);
});

test("quote: pickup is free even with a Newry address", async () => {
  const q = await quoteAt([leg(1, "Trio Collection")], NEWRY, "Pickup");
  assert.equal(q.deliveryFee, 0);
  assert.equal(q.deliveryTier, "pickup");
});

test("saved Newry order matches the quote; client-sent fee/total ignored", async () => {
  const items = [leg(1, "Grand Dozen (Box of 12)"), legd(1)];
  const q = await quoteAt(items, NEWRY);
  const r = await post("/", { ...customer, address: NEWRY, items, deliveryFee: 0, totalAmount: 1, deliveryTier: "standard" });
  assert.equal(r.status, 201);
  assert.equal(saved.deliveryFee, 3.5);
  assert.equal(saved.deliveryTier, "newry");
  assert.equal(saved.totalAmount, q.totalAmount);
  assert.equal(saved.address, NEWRY);
  assert.equal(saved.pastryUnits, 12);
  assert.equal(saved.drinkUnits, 1);
});

test("saved order outside Newry keeps the standard fee", async () => {
  const r = await post("/", { ...customer, address: ELSEWHERE, items: [leg(1, "Grand Dozen (Box of 12)")] });
  assert.equal(r.status, 201);
  assert.equal(saved.deliveryFee, 7.99);
  assert.equal(saved.deliveryTier, "standard");
});

test("saved pickup order with a Newry address is free and stores no address", async () => {
  const r = await post("/", { ...customer, method: "Pickup", address: NEWRY, items: [leg(1, "Trio Collection")] });
  assert.equal(r.status, 201);
  assert.equal(saved.deliveryFee, 0);
  assert.equal(saved.address, "");
});

test("admin manual order: Newry address gets £3.50, other address keeps the tier fee", async () => {
  const { createOrder } = require("../controllers/order.controller");
  const run = async (address, pastryCount) => {
    saved = null;
    const res = { status() { return this; }, json() { return this; } };
    await createOrder(
      { user: { role: "admin" }, body: { customerName: "Phone", phone: "07700 900000", method: "Delivery", address, pastryCount, drinkCount: 0, items: [{ manual: true, name: "Party tray", quantity: 1, price: 50 }] } },
      res, (e) => { throw e; }
    );
    return saved;
  };
  const n = await run(NEWRY, 60);
  assert.equal(n.deliveryFee, 3.5); assert.equal(n.deliveryTier, "newry"); assert.equal(n.totalAmount, 53.5);
  const o = await run(ELSEWHERE, 60);
  assert.equal(o.deliveryFee, 9.99); assert.equal(o.deliveryTier, "large"); assert.equal(o.totalAmount, 59.99);
});

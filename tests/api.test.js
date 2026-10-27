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
const PIE = id(), ZOBO = id(), OFF = id();
const catalog = [
  { _id: PIE,  name: "Meat Pie",  category: "Pastries", active: true,  options: [{ label: "Single Pastry", price: 5.5, units: 1 }, { label: "Grand Dozen", price: 66, units: 12 }] },
  { _id: ZOBO, name: "Zobo",      category: "Drinks",   active: true,  options: [{ label: "Bottle", price: 6.5, units: 1 }] },
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

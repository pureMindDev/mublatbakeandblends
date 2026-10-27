const test = require("node:test");
const assert = require("node:assert/strict");
const { priceLines } = require("../services/pricingService");

const P = (id, category, options, active = true) => ({ _id: id, name: `P-${id}`, category, options, active });
const products = new Map([
  ["pie",   P("pie", "Pastries", [{ label: "Single", price: 5.5, units: 1 }, { label: "Trio", price: 16.5, units: 3 }, { label: "Dozen", price: 66, units: 12 }])],
  ["zobo",  P("zobo", "Drinks",  [{ label: "Bottle", price: 6.5, units: 1 }])],
  ["gift",  P("gift", "Other",   [{ label: "Card", price: 10, units: 1 }])],
  ["old",   P("old", "Pastries", [{ label: "Single", price: 1, units: 1 }], false)],
]);
const line = (product, optionName, quantity) => ({ product, optionName, quantity });
const price = (lines, method = "Delivery") => priceLines(lines, products, method);

test("server uses DB prices, never client prices", () => {
  const r = price([{ ...line("pie", "Single", 2), price: 0.01 }]);
  assert.equal(r.subtotal, 11);
  assert.equal(r.deliveryFee, 7.99);
  assert.equal(r.totalAmount, 18.99);
});

test("pack sizes count as pieces: 2 dozen + 1 trio + 3 singles = 30 (standard), +1 = 31 (large)", () => {
  const r30 = price([line("pie", "Dozen", 2), line("pie", "Trio", 1), line("pie", "Single", 3)]);
  assert.equal(r30.pastryUnits, 30);
  assert.equal(r30.deliveryTier, "standard");
  const r31 = price([line("pie", "Dozen", 2), line("pie", "Trio", 1), line("pie", "Single", 4)]);
  assert.equal(r31.pastryUnits, 31);
  assert.equal(r31.deliveryTier, "large");
  assert.equal(r31.deliveryFee, 9.99);
});

test("mixed and single-category baskets", () => {
  const mix = (pastries, drinks) => price([...(pastries ? [line("pie", "Single", pastries)] : []), ...(drinks ? [line("zobo", "Bottle", drinks)] : [])]);
  assert.equal(mix(30, 0).deliveryFee, 7.99);
  assert.equal(mix(31, 0).deliveryFee, 9.99);
  assert.equal(mix(0, 6).deliveryFee, 7.99);
  assert.equal(mix(0, 7).deliveryFee, 9.99);
  assert.equal(mix(20, 4).deliveryFee, 7.99);
  assert.equal(mix(30, 6).deliveryFee, 7.99);
  assert.equal(mix(31, 2).deliveryFee, 9.99);
  assert.equal(mix(10, 7).deliveryFee, 9.99);
  assert.equal(mix(31, 7).deliveryFee, 9.99);
});

test("'Other' items don't count towards limits", () => {
  const r = price([line("pie", "Single", 30), line("gift", "Card", 20)]);
  assert.equal(r.pastryUnits, 30);
  assert.equal(r.deliveryTier, "standard");
});

test("pickup has no delivery charge", () => {
  const r = price([line("pie", "Single", 40)], "Pickup");
  assert.equal(r.deliveryFee, 0);
  assert.equal(r.totalAmount, 220);
});

test("rejects bad quantities, inactive products, unknown options, empty carts", () => {
  for (const q of [0, -1, 1.5, "x", 101, null]) assert.throws(() => price([line("pie", "Single", q)]), /Quantity/);
  assert.throws(() => price([line("old", "Single", 1)]), /no longer available/);
  assert.throws(() => price([line("pie", "Nope", 1)]), /no longer available/);
  assert.throws(() => price([line("ghost", "Single", 1)]), /no longer available/);
  assert.throws(() => price([]), /at least one item/);
});

test("pennies stay exact", () => {
  const r = price([line("zobo", "Bottle", 3)]);
  assert.equal(r.subtotal, 19.5);
  assert.equal(r.totalAmount, 27.49);
});

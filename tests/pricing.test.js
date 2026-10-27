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

// ---- Pack-size counting when `units` was never stored (legacy / seeded data) ----
const legacy = new Map([
  ["lp", P("lp", "Pastries", [{ label: "Single Pastry", price: 5.5 }, { label: "Trio Collection", price: 16.5 }, { label: "Grand Dozen (Box of 12)", price: 66 }, { label: "3 pieces", price: 15 }, { label: "12 pieces", price: 60 }])],
  ["ld", P("ld", "Drinks",   [{ label: "Regular Cup", price: 6.5 }, { label: "Family Bottle", price: 18 }])],
]);
const lp = (lines, m = "Delivery") => priceLines(lines, legacy, m);

test("pack counts: 1x3 = 3, 1x12 = 12, 2x12 = 24, 5x3 = 15 (units missing in DB)", () => {
  assert.equal(lp([line("lp", "Trio Collection", 1)]).pastryUnits, 3);
  assert.equal(lp([line("lp", "Grand Dozen (Box of 12)", 1)]).pastryUnits, 12);
  assert.equal(lp([line("lp", "Grand Dozen (Box of 12)", 2)]).pastryUnits, 24);
  assert.equal(lp([line("lp", "Trio Collection", 5)]).pastryUnits, 15);
  assert.equal(lp([line("lp", "3 pieces", 3)]).pastryUnits, 9);
  assert.equal(lp([line("lp", "12 pieces", 2)]).pastryUnits, 24);
  assert.equal(lp([line("lp", "Single Pastry", 4)]).pastryUnits, 4);
});

test("pack sizes are not counted twice and money is unaffected", () => {
  const r = lp([line("lp", "Grand Dozen (Box of 12)", 2)]);
  assert.equal(r.subtotal, 132);              // 2 x 66, not 24 x 66
  assert.equal(r.items[0].quantity, 2);
  assert.equal(r.items[0].units, 12);
});

test("mixed basket: 24 pastries + 7 bottles = large; 24 + 6 = standard; 31 pastries = large", () => {
  assert.equal(lp([line("lp", "Grand Dozen (Box of 12)", 2), line("ld", "Regular Cup", 7)]).deliveryTier, "large");
  const ok = lp([line("lp", "Grand Dozen (Box of 12)", 2), line("ld", "Regular Cup", 6)]);
  assert.equal(ok.deliveryTier, "standard");
  assert.equal(ok.drinkUnits, 6);
  assert.equal(lp([line("lp", "Grand Dozen (Box of 12)", 2), line("lp", "Trio Collection", 2), line("lp", "Single Pastry", 1)]).deliveryTier, "large"); // 31
  assert.equal(lp([line("lp", "Grand Dozen (Box of 12)", 1), line("lp", "Trio Collection", 6)]).pastryUnits, 30);
});

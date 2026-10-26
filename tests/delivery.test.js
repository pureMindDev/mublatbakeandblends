const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateDelivery } = require("../utils/delivery");

const fee = (pastryCount, drinkCount, method = "Delivery") =>
  calculateDelivery({ method, pastryCount, drinkCount });

test("client's example baskets", () => {
  assert.equal(fee(10, 4).fee, 7.99);
  assert.equal(fee(15, 6).fee, 7.99);
  assert.equal(fee(16, 2).fee, 9.99);
  assert.equal(fee(5, 7).fee, 9.99);
  assert.equal(fee(16, 7).fee, 9.99); // both exceeded -> NOT 19.98
});

test("thresholds: exactly at the limit vs one above", () => {
  assert.equal(fee(15, 0).tier, "standard");
  assert.equal(fee(16, 0).tier, "large");
  assert.equal(fee(0, 6).tier, "standard");
  assert.equal(fee(0, 7).tier, "large");
  assert.equal(fee(15, 7).tier, "large");
  assert.equal(fee(16, 6).tier, "large");
});

test("30 meat pies and 12 bottles are large orders (policy examples)", () => {
  assert.equal(fee(30, 0).fee, 9.99);
  assert.equal(fee(0, 12).fee, 9.99);
});

test("pickup is free, empty basket is free", () => {
  assert.deepEqual(fee(40, 40, "Pickup"), { fee: 0, tier: "pickup" });
  assert.deepEqual(calculateDelivery({ method: "Delivery", pastryCount: 0, drinkCount: 0, hasItems: false }), { fee: 0, tier: "none" });
});

test("a basket with only 'Other' items still gets the standard charge", () => {
  assert.deepEqual(fee(0, 0), { fee: 7.99, tier: "standard" });
});

test("invalid / negative / NaN quantities cannot lower or break the charge", () => {
  assert.equal(fee(-100, NaN).fee, 7.99);
  assert.equal(fee("abc", undefined).fee, 7.99);
  assert.equal(fee(-5, 7).fee, 9.99);
  assert.equal(fee(15.9, 6.9).fee, 7.99); // floored
});

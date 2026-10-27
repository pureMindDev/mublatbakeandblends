const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateDelivery, DELIVERY_RULES } = require("../utils/delivery");

const fee = (pastryCount, drinkCount, method = "Delivery") =>
  calculateDelivery({ method, pastryCount, drinkCount });

test("rules are 30 pastry pieces / 6 drink bottles, £7.99 and £9.99", () => {
  assert.equal(DELIVERY_RULES.maxPastriesStandard, 30);
  assert.equal(DELIVERY_RULES.maxDrinksStandard, 6);
  assert.equal(DELIVERY_RULES.standardFee, 7.99);
  assert.equal(DELIVERY_RULES.largeFee, 9.99);
});

test("client's example baskets", () => {
  assert.equal(fee(30, 0).fee, 7.99);  // 30 pastries only
  assert.equal(fee(31, 0).fee, 9.99);  // 31 pastries only
  assert.equal(fee(0, 6).fee, 7.99);   // 6 bottles only
  assert.equal(fee(0, 7).fee, 9.99);   // 7 bottles only
  assert.equal(fee(20, 4).fee, 7.99);
  assert.equal(fee(31, 2).fee, 9.99);
  assert.equal(fee(10, 7).fee, 9.99);
});

test("exact thresholds and immediately above them", () => {
  assert.equal(fee(30, 6).tier, "standard"); // both exactly at the limit
  assert.equal(fee(31, 6).tier, "large");    // pastries one over
  assert.equal(fee(30, 7).tier, "large");    // drinks one over
  assert.equal(fee(31, 7).tier, "large");    // both over
  assert.equal(fee(29, 5).tier, "standard"); // one under
  assert.equal(fee(15, 0).tier, "standard"); // old 15 limit no longer applies
  assert.equal(fee(16, 2).tier, "standard");
});

test("both limits exceeded is still £9.99, never summed", () => {
  assert.equal(fee(31, 7).fee, 9.99);
  assert.equal(fee(500, 500).fee, 9.99);
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
  assert.equal(fee(30.9, 6.9).fee, 7.99); // floored to 30 / 6
  assert.equal(fee(31.2, 0).fee, 9.99);
});

test("exhaustive: £9.99 iff pastries > 30 OR drinks > 6, else £7.99 (never summed)", () => {
  for (let p = 0; p <= 70; p++) for (let d = 0; d <= 30; d++) {
    const expected = p > 30 || d > 6 ? 9.99 : 7.99;
    assert.equal(fee(p, d).fee, expected, `${p} pastries + ${d} drinks`);
  }
});

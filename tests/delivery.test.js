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

// ---- Newry special delivery area (£3.50 flat) ----
const { isNewryAddress } = require("../utils/delivery");

test("Newry: confirmed addresses get £3.50 whatever the basket size", () => {
  for (const address of [
    "12 Hill Street, Newry, BT35 6DR",
    "12 Hill Street, newry, bt34 1aa",
    "Flat 2, 12 Hill Street, NEWRY, Co. Down, BT35 6DR",
    "12 Hill Street, Newry City, BT34 2XX",
    "12 Hill Street,  Newry ,BT356DR",
  ]) {
    assert.equal(isNewryAddress(address), true, address);
    assert.deepEqual(calculateDelivery({ method: "Delivery", pastryCount: 5, drinkCount: 1, address }), { fee: 3.5, tier: "newry" });
    assert.equal(calculateDelivery({ method: "Delivery", pastryCount: 99, drinkCount: 40, address }).fee, 3.5); // never £9.99 or summed
  }
});

test("Newry: not applied to other places or unconfirmed addresses", () => {
  for (const address of [
    "12 Hill Street, Belfast, BT1 1AA",
    "Newry Road, Kilkeel, BT34 4AB",          // street name only
    "3 Main St, Warrenpoint, BT34 3JA",       // same postcode district, different town
    "12 Hill Street, Newry, E1 1AA",          // town says Newry but postcode is not
    "12 Hill Street, Newry, BT36 6DR",        // not a Newry district
    "12 Hill Street, Newry",                  // no postcode
    "12 Hill Street, Newport, BT35 6DR",
    "12 Hill Street, Newry Heights, BT35 6DR",
    "BT35 6DR",
    "",
    undefined,
  ]) {
    assert.equal(isNewryAddress(address), false, String(address));
    assert.equal(calculateDelivery({ method: "Delivery", pastryCount: 5, drinkCount: 1, address }).fee, 7.99, String(address));
    assert.equal(calculateDelivery({ method: "Delivery", pastryCount: 31, drinkCount: 0, address }).fee, 9.99, String(address));
  }
});

test("Newry: pickup stays free and an empty basket stays free", () => {
  const address = "12 Hill Street, Newry, BT35 6DR";
  assert.deepEqual(calculateDelivery({ method: "Pickup", pastryCount: 5, drinkCount: 1, address }), { fee: 0, tier: "pickup" });
  assert.deepEqual(calculateDelivery({ method: "Delivery", pastryCount: 0, drinkCount: 0, hasItems: false, address }), { fee: 0, tier: "none" });
});

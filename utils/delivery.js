/**
 * Single source of truth (backend) for delivery charges.
 *
 * Client policy (Mublat Bakes & Blends — Delivery Charges):
 *   Standard £7.99  — up to 30 pastry pieces AND up to 6 drink bottles
 *   Large    £9.99  — more than 30 pastry pieces OR more than 6 drink bottles
 *
 * If both limits are exceeded the fee stays £9.99 (it is never added together).
 * The frontend keeps a mirror of this file at src/utils/delivery.js — if you
 * change a rule or a price, change BOTH files and the unit tests.
 */

const DELIVERY_RULES = Object.freeze({
  standardFee: 7.99,
  largeFee: 9.99,
  maxPastriesStandard: 30,
  maxDrinksStandard: 6,
});

/** Whole, non-negative number — anything else (NaN, negative, text) becomes 0. */
const toCount = (n) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/**
 * @param {object}  p
 * @param {string}  p.method        "Delivery" | "Pickup" (case-insensitive)
 * @param {number}  p.pastryCount   total pastry pieces in the basket
 * @param {number}  p.drinkCount    total drink bottles in the basket
 * @param {boolean} [p.hasItems]    false for an empty basket (no charge)
 * @returns {{ fee: number, tier: "none"|"pickup"|"standard"|"large" }}
 */
function calculateDelivery({ method, pastryCount, drinkCount, hasItems = true }) {
  if (!hasItems) return { fee: 0, tier: "none" };
  if (String(method || "").toLowerCase() !== "delivery") {
    return { fee: 0, tier: "pickup" };
  }

  const pastries = toCount(pastryCount);
  const drinks = toCount(drinkCount);

  const isLarge =
    pastries > DELIVERY_RULES.maxPastriesStandard ||
    drinks > DELIVERY_RULES.maxDrinksStandard;

  return isLarge
    ? { fee: DELIVERY_RULES.largeFee, tier: "large" }
    : { fee: DELIVERY_RULES.standardFee, tier: "standard" };
}

module.exports = { DELIVERY_RULES, calculateDelivery, toCount };

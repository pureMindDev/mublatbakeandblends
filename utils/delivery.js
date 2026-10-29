/**
 * Single source of truth (backend) for delivery charges.
 *
 * Client policy (Mublat Bakes & Blends — Delivery Charges):
 *   Standard £7.99  — up to 30 pastry pieces AND up to 6 drink bottles
 *   Large    £9.99  — more than 30 pastry pieces OR more than 6 drink bottles
 *
 * Newry delivery addresses are a flat £3.50 (see isNewryAddress).
 * If both limits are exceeded the fee stays £9.99 (it is never added together).
 * The frontend keeps a mirror of this file at src/utils/delivery.js — if you
 * change a rule or a price, change BOTH files and the unit tests.
 */

const DELIVERY_RULES = Object.freeze({
  standardFee: 7.99,
  largeFee: 9.99,
  maxPastriesStandard: 30,
  maxDrinksStandard: 6,
  newryFee: 3.5,
});

/** Whole, non-negative number — anything else (NaN, negative, text) becomes 0. */
const toCount = (n) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/**
 * Pieces/bottles one unit of an option contains.
 * Uses the stored `units` when it is > 1. Because `units` defaults to 1 (and
 * products created before it existed never had it), a pack option whose LABEL
 * states its size ("Trio Collection", "Box of 12", "6 pieces") would otherwise
 * count as 1 piece. In that case the size is read from the label.
 */
const optionUnits = (option, category) => {
  const stored = toCount(option && option.units);
  if (stored > 1) return stored;
  if (category !== "Pastries" && category !== "Drinks") return Math.max(1, stored);
  const label = String((option && (option.label || option.name)) || "").toLowerCase();
  let m = label.match(/(?:box|pack|set|tray)\s+of\s+(\d+)/) || label.match(/(\d+)\s*[- ]?\s*(?:pieces?|pcs|pc|pack|box|bottles?)\b/);
  if (m) { const n = toCount(m[1]); if (n > 0 && n <= 500) return n; }
  if (/half[\s-]*dozen/.test(label)) return 6;
  if (/dozen/.test(label)) return 12;
  if (/trio/.test(label)) return 3;
  return Math.max(1, stored);
};


/* ── Newry special delivery area ───────────────────────────────────────────
 * Client rule: delivery to Newry is a flat £3.50 (regardless of basket size).
 * "Confirmed" means BOTH the town is Newry AND the postcode is a Newry
 * district (BT34 / BT35). The address is the one string the order stores,
 * written by checkout as "street, town, postcode"; the street line is never
 * used (so "Newry Road, Kilkeel" does not qualify). Towns that merely share
 * the BT34/BT35 postcode (Warrenpoint, Kilkeel...) do not get the fee.
 * Mirror: src/utils/delivery.js — keep both identical.
 */
const NEWRY_POSTCODE = /^BT3[45]\d[A-Z]{2}$/;
const normalise = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function isNewryAddress(address) {
  const parts = String(address || "").split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const postcode = parts[parts.length - 1].toUpperCase().replace(/\s+/g, "");
  if (!NEWRY_POSTCODE.test(postcode)) return false;
  // Town candidates: everything between the street line and the postcode
  // (or the only line before the postcode when there is no street line).
  const towns = parts.length === 2 ? [parts[0]] : parts.slice(1, -1);
  return towns.some((t) => ["newry", "newry city"].includes(normalise(t)));
}

/**
 * @param {object}  p
 * @param {string}  p.method        "Delivery" | "Pickup" (case-insensitive)
 * @param {number}  p.pastryCount   total pastry pieces in the basket
 * @param {number}  p.drinkCount    total drink bottles in the basket
 * @param {boolean} [p.hasItems]    false for an empty basket (no charge)
 * @param {string}  [p.address]     delivery address ("street, town, postcode")
 * @returns {{ fee: number, tier: "none"|"pickup"|"newry"|"standard"|"large" }}
 */
function calculateDelivery({ method, pastryCount, drinkCount, hasItems = true, address }) {
  if (!hasItems) return { fee: 0, tier: "none" };
  if (String(method || "").toLowerCase() !== "delivery") {
    return { fee: 0, tier: "pickup" };
  }

  if (isNewryAddress(address)) return { fee: DELIVERY_RULES.newryFee, tier: "newry" };

  const pastries = toCount(pastryCount);
  const drinks = toCount(drinkCount);

  const isLarge =
    pastries > DELIVERY_RULES.maxPastriesStandard ||
    drinks > DELIVERY_RULES.maxDrinksStandard;

  return isLarge
    ? { fee: DELIVERY_RULES.largeFee, tier: "large" }
    : { fee: DELIVERY_RULES.standardFee, tier: "standard" };
}

module.exports = { DELIVERY_RULES, calculateDelivery, isNewryAddress, toCount, optionUnits };

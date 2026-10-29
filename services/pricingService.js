/**
 * Authoritative order pricing.
 *
 * Customers only ever tell us WHICH product/option and HOW MANY. Prices,
 * categories, pack sizes and the delivery fee are all taken from the database
 * here — anything a client sends for those is ignored.
 */
const mongoose = require("mongoose");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const { calculateDelivery, optionUnits } = require("../utils/delivery");

const MAX_LINE_QUANTITY = 100;
const MAX_LINES = 50;

const toPence = (n) => Math.round(Number(n) * 100);
const fromPence = (p) => p / 100;

/**
 * Pure pricing step (no database) so it can be unit tested.
 *
 * @param {Array<{product, optionName, quantity}>} lines  raw cart lines
 * @param {Map<string, object>} productsById              id -> product doc/object
 * @param {string} method                                 "Delivery" | "Pickup"
 * @param {string} [address]                              delivery address (decides the Newry fee)
 */
function priceLines(lines, productsById, method, address) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw ApiError.badRequest("Order must contain at least one item");
  }
  if (lines.length > MAX_LINES) {
    throw ApiError.badRequest("Too many different items in one order");
  }

  let subtotalPence = 0;
  let pastryUnits = 0;
  let drinkUnits = 0;
  const items = [];

  for (const line of lines) {
    const qty = Number(line.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QUANTITY) {
      throw ApiError.badRequest(
        `Quantity must be a whole number between 1 and ${MAX_LINE_QUANTITY}`
      );
    }

    const product = productsById.get(String(line.product));
    if (!product || product.active === false) {
      throw ApiError.badRequest(
        `"${line.name || "An item"}" is no longer available. Please remove it from your cart.`
      );
    }

    const option = (product.options || []).find((o) => o.label === line.optionName);
    if (!option) {
      throw ApiError.badRequest(
        `"${product.name}" (${line.optionName || "unknown option"}) is no longer available. Please re-add it from the menu.`
      );
    }

    const units = optionUnits(option, product.category);
    const pieces = qty * units;

    if (product.category === "Pastries") pastryUnits += pieces;
    else if (product.category === "Drinks") drinkUnits += pieces;
    // "Other" never counts toward the pastry or drink limits.

    subtotalPence += toPence(option.price) * qty;

    items.push({
      product: product._id,
      name: product.name,
      optionName: option.label,
      quantity: qty,
      price: Number(option.price),
      category: product.category,
      units,
    });
  }

  const delivery = calculateDelivery({ method, pastryCount: pastryUnits, drinkCount: drinkUnits, address });
  const subtotal = fromPence(subtotalPence);
  const total = fromPence(subtotalPence + toPence(delivery.fee));

  return {
    items,
    subtotal,
    pastryUnits,
    drinkUnits,
    deliveryFee: delivery.fee,
    deliveryTier: delivery.tier,
    totalAmount: total,
  };
}

/** Loads products for the cart lines, then prices them. */
async function priceOrder(rawItems, method, address) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw ApiError.badRequest("Order must contain at least one item");
  }

  const lines = rawItems.map((i) => ({
    product: i.product || i.id,
    name: i.name,
    optionName: i.optionName,
    quantity: i.quantity,
  }));

  const ids = [...new Set(lines.map((l) => String(l.product)))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw ApiError.badRequest(
      "Your cart contains an item that is no longer on the menu. Please remove it and add it again."
    );
  }

  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return priceLines(lines, byId, method, address);
}

module.exports = { priceOrder, priceLines, MAX_LINE_QUANTITY };

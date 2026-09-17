const mongoose = require("mongoose");

/**
 * Generic atomic counter collection.
 * Used to generate sequential, race-safe order numbers (MUB-0001, MUB-0002, ...).
 *
 * Each document is a named sequence: { _id: "orderNumber", seq: 42 }
 * Incrementing is done with a single atomic findOneAndUpdate($inc), so two
 * requests arriving at the same time can never receive the same number.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // sequence name, e.g. "orderNumber"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);

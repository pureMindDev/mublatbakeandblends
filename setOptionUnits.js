/**
 * One-off helper: set `units` (pieces/bottles per option) on EXISTING product
 * options, so pack options count correctly toward the delivery limits.
 *
 *   node setOptionUnits.js           -> DRY RUN, prints what would change
 *   node setOptionUnits.js --apply   -> writes the changes
 *
 * It only touches options that do not already have `units` stored, and only
 * changes products/options; it never touches orders. The mapping below is an
 * explicit list of labels you can edit — runtime delivery logic never guesses
 * from names. Anything not listed keeps units = 1 (e.g. a single cup/bottle).
 * Review the dry-run output against your real menu before using --apply, and
 * fix any remaining pack sizes in Admin > Products (new "Units" field).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const LABEL_UNITS = {
  "Single Pastry": 1,
  "Trio Collection": 3,
  "Grand Dozen (Box of 12)": 12,
};

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  // Raw collection access so we can see which options truly lack `units`
  // (the Mongoose model would otherwise hand back its default of 1).
  const raw = await Product.collection.find({}).toArray();
  let changes = 0;

  for (const p of raw) {
    let touched = false;
    const options = (p.options || []).map((o) => {
      if (o.units !== undefined) return o;
      const units = LABEL_UNITS[o.label] ?? 1;
      console.log(`${apply ? "SET" : "would set"}  ${p.name} / "${o.label}" -> units ${units}`);
      touched = true;
      changes++;
      return { ...o, units };
    });
    if (touched && apply) {
      await Product.collection.updateOne({ _id: p._id }, { $set: { options } });
    }
  }

  console.log(`\n${changes} option(s) ${apply ? "updated" : "would be updated (dry run — nothing written)"}.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });

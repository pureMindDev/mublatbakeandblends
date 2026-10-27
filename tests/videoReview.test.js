const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

process.env.CLOUDINARY_CLOUD_NAME = "democloud";
process.env.CLOUDINARY_API_KEY = "key123";
process.env.CLOUDINARY_API_SECRET = "secret456";

const VideoReview = require("../models/VideoReview");
let created = null;
VideoReview.create = async (d) => { created = d; return { ...d, _id: "x" }; };
const c = require("../controllers/videoReviewController");
const errorHandler = require("../middlewares/errorMiddleware");

let server, base;
test.before(async () => {
  const app = express(); app.use(express.json());
  app.get("/sig", c.getUploadSignature);
  app.post("/", c.createVideoReview);
  app.use(errorHandler);
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
const post = (b) => fetch(base + "/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.json() }));

test("signature matches Cloudinary's algorithm and never leaks the secret", async () => {
  const r = await (await fetch(base + "/sig")).json();
  const crypto = require("crypto");
  const expected = crypto.createHash("sha1").update(`folder=${r.folder}&timestamp=${r.timestamp}secret456`).digest("hex");
  assert.equal(r.signature, expected);
  assert.equal(r.cloudName, "democloud");
  assert.ok(!JSON.stringify(r).includes("secret456"));
});

test("registers a finished Cloudinary upload as UNAPPROVED with a poster", async () => {
  const r = await post({ videoUrl: "https://res.cloudinary.com/democloud/video/upload/v1/mublat/video-reviews/a.mp4", cloudinaryId: "mublat/video-reviews/a" });
  assert.equal(r.status, 201);
  assert.equal(created.approved, false);
  assert.match(created.posterUrl, /^https:\/\/res\.cloudinary\.com\/democloud\/video\/upload\/.*\.jpg(\?.*)?$/);
});

test("rejects other accounts' URLs, foreign ids and unsafe schemes", async () => {
  assert.equal((await post({ videoUrl: "https://res.cloudinary.com/evil/video/upload/a.mp4", cloudinaryId: "mublat/video-reviews/a" })).status, 400);
  assert.equal((await post({ videoUrl: "https://res.cloudinary.com/democloud/video/upload/a.mp4", cloudinaryId: "other/folder/a" })).status, 400);
  assert.equal((await post({ videoUrl: "javascript:alert(1)" })).status, 400);
  assert.equal((await post({ videoUrl: "/videos/../secret.mp4" })).status, 400);
});

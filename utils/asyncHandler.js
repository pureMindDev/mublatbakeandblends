/**
 * Wraps an async route handler and forwards any thrown errors
 * to Express's next(err) — eliminating try/catch boilerplate.
 *
 * Usage:
 *   router.get("/", asyncHandler(async (req, res) => {
 *     const items = await Something.find();
 *     res.json(items);
 *   }));
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

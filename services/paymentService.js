import api from "./api";

/**
 * POST /api/payment/create-intent
 * Creates a PaymentIntent + pending Order in DB.
 * Returns { clientSecret, orderId, orderRef }
 */
export const createPaymentIntent = async (payload) => {
  const { data } = await api.post("/payment/create-intent", payload);
  return data;
};

/**
 * POST /api/payment/confirm
 * Called after Stripe confirms payment on the client.
 * Marks order paid and triggers emails.
 */
export const confirmPayment = async ({ paymentIntentId, orderId }) => {
  const { data } = await api.post("/payment/confirm", { paymentIntentId, orderId });
  return data;
};
const { BrevoClient } = require("@getbrevo/brevo");
const { BANK_DETAILS } = require("../utils/constants");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sender = {
  name: process.env.BREVO_FROM_NAME || "Mublat Bake & Blends",
  email: process.env.BREVO_FROM_EMAIL,
};

// ─── Shared Components ────────────────────────────────────────────────────────

const logoBlock = `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:10px 0 6px;">
      <span style="
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 34px;
        font-weight: bold;
        letter-spacing: 2px;
        color: #d4af37;
      ">Mublat</span>
      <span style="
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 18px;
        color: #ffffff;
        letter-spacing: 3px;
        display: block;
        margin-top: 2px;
        text-transform: uppercase;
      ">Bake &amp; Blends</span>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-bottom:6px;">
      <div style="
        width: 60px;
        height: 2px;
        background: linear-gradient(to right, transparent, #d4af37, transparent);
        margin: 0 auto;
      "></div>
    </td>
  </tr>
</table>
`;

const footerBlock = `
<tr>
  <td style="
    background: #111111;
    padding: 32px 40px;
    text-align: center;
    border-top: 3px solid #d4af37;
  ">
    <p style="margin:0 0 6px; color:#d4af37; font-family:Georgia,serif; font-size:15px; letter-spacing:1px;">
      Mublat Bake &amp; Blends
    </p>
    <p style="margin:0 0 4px; color:#aaaaaa; font-size:13px; font-family:Arial,sans-serif;">
      📍 33 College Garden, BT35 6DR
    </p>
    <p style="margin:0 0 18px; color:#aaaaaa; font-size:13px; font-family:Arial,sans-serif;">
      📞 +44 7700 000000
    </p>
    <div style="width:40px;height:1px;background:#333;margin:0 auto 14px;"></div>
    <p style="margin:0; color:#555555; font-size:12px; font-family:Arial,sans-serif;">
      © ${new Date().getFullYear()} Mublat Bake &amp; Blends · All rights reserved
    </p>
  </td>
</tr>
`;

// ─── Customer Order Confirmation ──────────────────────────────────────────────

const buildOrderHtml = (order) => {
  const isPaid = order.paymentStatus === "Paid";
  const isBankTransfer = order.paymentMethod === "Bank Transfer";

  const paymentBannerBlock = !isPaid
    ? `
    <tr>
      <td style="padding: 28px 40px 0;">
        <div style="
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-left: 5px solid #ffc107;
          border-radius: 0 10px 10px 0;
          padding: 18px 22px;
        ">
          <p style="margin:0 0 6px;font-weight:bold;color:#333;font-size:14px;font-family:Arial,sans-serif;">
            ⏳ Payment Status: Awaiting Bank Transfer
          </p>
          <p style="margin:0;font-size:14px;color:#666;line-height:1.6;font-family:Arial,sans-serif;">
            Your order has been received, but payment has not been confirmed yet. Please complete your
            bank transfer using the details below — we'll email you again the moment it's confirmed.
          </p>
        </div>
      </td>
    </tr>`
    : "";

  const bankDetailsBlock = !isPaid && isBankTransfer
    ? `
    <tr>
      <td style="padding: 24px 40px 0;">
        <h3 style="
          margin: 0 0 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          font-family: Arial, sans-serif;
        ">Bank Transfer Details</h3>
        <table width="100%" style="border-collapse:collapse;border:1px solid #f0ece0;border-radius:10px;overflow:hidden;">
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;width:40%;">BANK</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;">${BANK_DETAILS.bankName}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">ACCOUNT NAME</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${BANK_DETAILS.accountName}</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">SORT CODE</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${BANK_DETAILS.sortCode}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">ACCOUNT NUMBER</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${BANK_DETAILS.accountNumber}</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">REFERENCE</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;font-weight:bold;border-top:1px solid #f5f5f5;">${order.orderId}</td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  const rows = order.items
    .map(
      (item) => `
<tr>
  <td style="
    padding: 16px 18px;
    border-bottom: 1px solid #f0ece0;
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #333;
  ">
    <strong>${item.name}</strong>
    ${
      item.optionName
        ? `<br><span style="font-size:12px;color:#999;margin-top:3px;display:inline-block;">${item.optionName}</span>`
        : ""
    }
  </td>
  <td style="
    padding: 16px 18px;
    text-align: center;
    border-bottom: 1px solid #f0ece0;
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #555;
  ">
    ${item.quantity}
  </td>
  <td style="
    padding: 16px 18px;
    text-align: right;
    border-bottom: 1px solid #f0ece0;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    color: #222;
  ">
    £${(item.price * item.quantity).toFixed(2)}
  </td>
</tr>
`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation – Mublat Bake &amp; Blends</title>
</head>
<body style="margin:0;padding:30px 10px;background:#f2ede4;font-family:Arial,sans-serif;">

  <table width="620" align="center" cellspacing="0" cellpadding="0"
    style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.10);">

    <!-- ── Header / Logo ── -->
    <tr>
      <td style="background:#111111;padding:36px 40px 30px;text-align:center;">
        ${logoBlock}
        <p style="
          margin: 14px 0 0;
          color: #cccccc;
          font-size: 14px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-family: Arial, sans-serif;
        ">Order Confirmation</p>
      </td>
    </tr>

    <!-- ── Greeting Banner ── -->
    <tr>
      <td style="
        background: linear-gradient(135deg, #fdf6e3, #faf0cc);
        padding: 28px 40px;
        border-bottom: 2px solid #f0e8c8;
        text-align: center;
      ">
        <p style="margin:0;font-size:22px;font-weight:bold;color:#333;">
          Hello, ${order.customerName}! 👋
        </p>
        <p style="margin:8px 0 0;color:#777;font-size:14px;">
          ${isPaid
            ? "We've received your order and our kitchen is already on it."
            : "We've received your order — it will move to preparation as soon as your payment is confirmed."}
        </p>
      </td>
    </tr>
    ${paymentBannerBlock}
    ${bankDetailsBlock}

    <!-- ── Order Summary ── -->
    <tr>
      <td style="padding: 36px 40px 0;">

        <h3 style="
          margin: 0 0 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          font-family: Arial, sans-serif;
        ">Order Summary</h3>

        <table width="100%" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #f0ece0;">
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;width:40%;">ORDER ID</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;font-weight:bold;">${order.orderId}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">STATUS</td>
            <td style="padding:13px 18px;border-top:1px solid #f5f5f5;">
              <span style="
                background:#fff8e1;
                color:#e6a817;
                font-size:13px;
                font-weight:bold;
                padding:4px 12px;
                border-radius:20px;
                border:1px solid #ffe082;
              ">${order.status}</span>
            </td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">PAYMENT</td>
            <td style="padding:13px 18px;border-top:1px solid #f5f5f5;">
              <span style="
                background:${isPaid ? "#e8f6ea" : "#fff8e1"};
                color:${isPaid ? "#2f9e44" : "#e6a817"};
                font-size:13px;
                font-weight:bold;
                padding:4px 12px;
                border-radius:20px;
                border:1px solid ${isPaid ? "#b2e2bb" : "#ffe082"};
              ">${isPaid ? "Paid" : "Awaiting Bank Transfer"}</span>
            </td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">DELIVERY</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.method}</td>
          </tr>
          ${
            order.address
              ? `
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">ADDRESS</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.address}</td>
          </tr>`
              : ""
          }
        </table>

      </td>
    </tr>

    <!-- ── Items Table ── -->
    <tr>
      <td style="padding: 32px 40px 0;">

        <h3 style="
          margin: 0 0 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          font-family: Arial, sans-serif;
        ">Items Ordered</h3>

        <table width="100%" style="border-collapse:collapse;border:1px solid #f0ece0;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#d4af37;">
              <th style="padding:14px 18px;text-align:left;color:#fff;font-size:13px;font-family:Arial,sans-serif;">Item</th>
              <th style="padding:14px 18px;text-align:center;color:#fff;font-size:13px;font-family:Arial,sans-serif;">Qty</th>
              <th style="padding:14px 18px;text-align:right;color:#fff;font-size:13px;font-family:Arial,sans-serif;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

      </td>
    </tr>

    <!-- ── Totals ── -->
    <tr>
      <td style="padding: 24px 40px 36px;">
        <table width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:10px 16px;font-size:14px;color:#666;font-family:Arial,sans-serif;">Delivery Fee</td>
            <td style="padding:10px 16px;text-align:right;font-size:14px;color:#444;font-family:Arial,sans-serif;">
              £${order.deliveryFee.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:0 16px;">
              <div style="border-top:2px dashed #e8e0cc;"></div>
            </td>
          </tr>
          <tr style="background:#faf7ef;border-radius:10px;">
            <td style="padding:16px;font-size:18px;font-weight:bold;color:#333;font-family:Arial,sans-serif;">
              Grand Total
            </td>
            <td style="padding:16px;text-align:right;font-size:22px;font-weight:bold;color:#d4af37;font-family:Arial,sans-serif;">
              £${order.totalAmount.toFixed(2)}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Thank You Note ── -->
    <tr>
      <td style="padding: 0 40px 36px;">
        <div style="
          background: #f9f6ef;
          border-left: 5px solid #d4af37;
          border-radius: 0 10px 10px 0;
          padding: 18px 22px;
        ">
          <p style="margin:0;font-size:14px;color:#666;line-height:1.7;font-family:Arial,sans-serif;">
            🍰 Thank you for choosing <strong style="color:#333;">Mublat Bake &amp; Blends</strong>.
            We pour love into every bite and can't wait for you to enjoy your order!
          </p>
        </div>
      </td>
    </tr>

    <!-- ── Footer ── -->
    ${footerBlock}

  </table>

</body>
</html>
`;
};

// ─── Admin New Order Notification ─────────────────────────────────────────────

const buildAdminHtml = (order) => {
  const rows = order.items
    .map(
      (item) => `
<tr>
  <td style="
    padding: 16px 18px;
    border-bottom: 1px solid #f0ece0;
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #333;
  ">
    <strong>${item.name}</strong>
    ${
      item.optionName
        ? `<br><span style="font-size:12px;color:#999;margin-top:3px;display:inline-block;">${item.optionName}</span>`
        : ""
    }
  </td>
  <td style="
    padding: 16px 18px;
    text-align: center;
    border-bottom: 1px solid #f0ece0;
    font-family: Arial, sans-serif;
    font-size: 14px;
    color: #555;
  ">
    ${item.quantity}
  </td>
  <td style="
    padding: 16px 18px;
    text-align: right;
    border-bottom: 1px solid #f0ece0;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    color: #222;
  ">
    £${(item.price * item.quantity).toFixed(2)}
  </td>
</tr>
`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order – Mublat Admin</title>
</head>
<body style="margin:0;padding:30px 10px;background:#f2ede4;font-family:Arial,sans-serif;">

  <table width="680" align="center" cellspacing="0" cellpadding="0"
    style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.10);">

    <!-- ── Header / Logo ── -->
    <tr>
      <td style="background:#111111;padding:36px 40px 30px;text-align:center;">
        ${logoBlock}
        <p style="
          margin: 14px 0 0;
          color: #cccccc;
          font-size: 13px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-family: Arial, sans-serif;
        ">Admin Notification</p>
      </td>
    </tr>

    <!-- ── Alert Banner ── -->
    <tr>
      <td style="
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        padding: 22px 40px;
        text-align: center;
        border-bottom: 2px solid #d4af37;
      ">
        <p style="margin:0;font-size:20px;font-weight:bold;color:#d4af37;letter-spacing:1px;">
          🛒 New Order Received
        </p>
        <p style="margin:6px 0 0;color:#aaa;font-size:13px;font-family:Arial,sans-serif;">
          A new customer order requires your attention
        </p>
      </td>
    </tr>

    <!-- ── Customer Details ── -->
    <tr>
      <td style="padding: 36px 40px 0;">

        <h3 style="
          margin: 0 0 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          font-family: Arial, sans-serif;
        ">Customer Details</h3>

        <table width="100%" style="border-collapse:collapse;border:1px solid #f0ece0;border-radius:10px;overflow:hidden;">
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;width:35%;">CUSTOMER</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;">${order.customerName}</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">EMAIL</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.email || "—"}</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">PHONE</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.phone}</td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">ORDER ID</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;font-weight:bold;border-top:1px solid #f5f5f5;">${order.orderId || order._id}</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">STATUS</td>
            <td style="padding:13px 18px;border-top:1px solid #f5f5f5;">
              <span style="
                background:#fff8e1;
                color:#e6a817;
                font-size:13px;
                font-weight:bold;
                padding:4px 12px;
                border-radius:20px;
                border:1px solid #ffe082;
              ">${order.status}</span>
            </td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">METHOD</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.method}</td>
          </tr>
          ${
            order.address
              ? `
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">ADDRESS</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.address}</td>
          </tr>`
              : ""
          }
          <tr style="background:#fff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">PAYMENT METHOD</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.paymentMethod || "Bank Transfer"}</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">PAYMENT STATUS</td>
            <td style="padding:13px 18px;border-top:1px solid #f5f5f5;">
              <span style="
                background:${order.paymentStatus === "Paid" ? "#e8f6ea" : "#fdeaea"};
                color:${order.paymentStatus === "Paid" ? "#2f9e44" : "#d9534f"};
                font-size:13px;
                font-weight:bold;
                padding:4px 12px;
                border-radius:20px;
                border:1px solid ${order.paymentStatus === "Paid" ? "#b2e2bb" : "#f3c6c6"};
              ">${order.paymentStatus || "Pending"}</span>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- ── Items Table ── -->
    <tr>
      <td style="padding: 32px 40px 0;">

        <h3 style="
          margin: 0 0 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          font-family: Arial, sans-serif;
        ">Items Ordered</h3>

        <table width="100%" style="border-collapse:collapse;border:1px solid #f0ece0;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#d4af37;">
              <th style="padding:14px 18px;text-align:left;color:#fff;font-size:13px;font-family:Arial,sans-serif;">Item</th>
              <th style="padding:14px 18px;text-align:center;color:#fff;font-size:13px;font-family:Arial,sans-serif;">Qty</th>
              <th style="padding:14px 18px;text-align:right;color:#fff;font-size:13px;font-family:Arial,sans-serif;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

      </td>
    </tr>

    <!-- ── Totals ── -->
    <tr>
      <td style="padding: 24px 40px 0;">
        <table width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:10px 16px;font-size:14px;color:#666;font-family:Arial,sans-serif;">Delivery Fee</td>
            <td style="padding:10px 16px;text-align:right;font-size:14px;color:#444;font-family:Arial,sans-serif;">
              £${Number(order.deliveryFee || 0).toFixed(2)}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:0 16px;">
              <div style="border-top:2px dashed #e8e0cc;"></div>
            </td>
          </tr>
          <tr style="background:#faf7ef;">
            <td style="padding:16px;font-size:18px;font-weight:bold;color:#333;font-family:Arial,sans-serif;">
              Total Amount
            </td>
            <td style="padding:16px;text-align:right;font-size:22px;font-weight:bold;color:#d4af37;font-family:Arial,sans-serif;">
              £${Number(order.totalAmount).toFixed(2)}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Action Required ── -->
    <tr>
      <td style="padding: 28px 40px 36px;">
        <div style="
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-left: 5px solid #ffc107;
          border-radius: 0 10px 10px 0;
          padding: 18px 22px;
        ">
          <p style="margin:0 0 6px;font-weight:bold;color:#333;font-size:14px;font-family:Arial,sans-serif;">
            ⚠️ Action Required
          </p>
          <p style="margin:0;font-size:14px;color:#666;line-height:1.6;font-family:Arial,sans-serif;">
            Please prepare this order and update its status in the admin dashboard once it's ready for dispatch or collection.
          </p>
        </div>
      </td>
    </tr>

    <!-- ── Footer ── -->
    ${footerBlock}

  </table>

</body>
</html>
`;
};

// ─── Send Functions ────────────────────────────────────────────────────────────

const sendOrderConfirmation = async (order) => {
  try {
    if (!order.email) {
      console.log("Customer has no email address.");
      return;
    }

    const subject = order.paymentStatus === "Paid"
      ? `🎉 Your Mublat Order #${order.orderId || order._id} is Confirmed`
      : `✅ Order Received — #${order.orderId || order._id} (Awaiting Bank Transfer)`;

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: order.email, name: order.customerName }],
      subject,
      htmlContent: buildOrderHtml(order),
    });

    console.log("✅ Customer confirmation email sent");
    return result;
  } catch (error) {
    console.error("❌ Customer Email Error");
    console.error(error);
  }
};

const sendAdminNotification = async (order) => {
  try {
    if (!process.env.ADMIN_EMAIL) {
      console.log("ADMIN_EMAIL not configured.");
      return;
    }

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: process.env.ADMIN_EMAIL, name: "Mublat Admin" }],
      subject: `🛒 New Order Received • ${order.orderId || order._id}`,
      htmlContent: buildAdminHtml(order),
    });

    console.log("✅ Admin notification email sent");
    return result;
  } catch (error) {
    console.error("❌ Admin Email Error");
    console.error(error);
  }
};

// ─── Payment Confirmation (sent when admin manually marks an order Paid) ──────

const buildPaymentConfirmedHtml = (order) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed – Mublat Bake &amp; Blends</title>
</head>
<body style="margin:0;padding:30px 10px;background:#f2ede4;font-family:Arial,sans-serif;">

  <table width="620" align="center" cellspacing="0" cellpadding="0"
    style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.10);">

    <tr>
      <td style="background:#111111;padding:36px 40px 30px;text-align:center;">
        ${logoBlock}
        <p style="
          margin: 14px 0 0;
          color: #cccccc;
          font-size: 14px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-family: Arial, sans-serif;
        ">Payment Confirmed</p>
      </td>
    </tr>

    <tr>
      <td style="
        background: linear-gradient(135deg, #eafaf0, #d7f3e2);
        padding: 28px 40px;
        border-bottom: 2px solid #b2e2bb;
        text-align: center;
      ">
        <p style="margin:0;font-size:22px;font-weight:bold;color:#2f9e44;">
          ✅ Payment Confirmed
        </p>
        <p style="margin:8px 0 0;color:#555;font-size:14px;">
          We've received your bank transfer for order <strong>${order.orderId}</strong>. Your order is now being processed.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding: 36px 40px 0;">
        <h3 style="
          margin: 0 0 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          font-family: Arial, sans-serif;
        ">Order Summary</h3>

        <table width="100%" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #f0ece0;">
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;width:40%;">ORDER ID</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;font-weight:bold;">${order.orderId}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">AMOUNT PAID</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;font-weight:bold;border-top:1px solid #f5f5f5;">£${Number(order.totalAmount).toFixed(2)}</td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">DELIVERY</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.method}</td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 28px 40px 36px;">
        <div style="
          background: #f9f6ef;
          border-left: 5px solid #d4af37;
          border-radius: 0 10px 10px 0;
          padding: 18px 22px;
        ">
          <p style="margin:0;font-size:14px;color:#666;line-height:1.7;font-family:Arial,sans-serif;">
            🍰 Thank you for choosing <strong style="color:#333;">Mublat Bake &amp; Blends</strong>.
            Your order is now in the kitchen queue — we'll keep you posted as it moves along.
          </p>
        </div>
      </td>
    </tr>

    ${footerBlock}

  </table>

</body>
</html>
`;

const sendPaymentConfirmation = async (order) => {
  try {
    if (!order.email) {
      console.log("Customer has no email address — payment confirmation skipped.");
      return;
    }

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: order.email, name: order.customerName }],
      subject: `✅ Payment Confirmed — Order #${order.orderId}`,
      htmlContent: buildPaymentConfirmedHtml(order),
    });

    console.log("✅ Payment confirmation email sent");
    return result;
  } catch (error) {
    console.error("❌ Payment Confirmation Email Error");
    console.error(error);
  }
};

// ─── Order Status Update (sent whenever an admin changes order.status) ────────

const STATUS_META = {
  "Pending":           { emoji: "🕒", color: "#e6a817", bg: "#fff8e1", border: "#ffe082", blurb: "Your order has been received and is waiting to be picked up by our kitchen." },
  "Preparing":         { emoji: "👩‍🍳", color: "#e6a817", bg: "#fff8e1", border: "#ffe082", blurb: "Great news — our kitchen has started preparing your order." },
  "Out for Delivery":  { emoji: "🚴", color: "#f5a623", bg: "#fff3e0", border: "#ffcc80", blurb: "Your order is on its way to you now." },
  "Delivered":         { emoji: "✅", color: "#2f9e44", bg: "#e8f6ea", border: "#b2e2bb", blurb: "Your order has been delivered. We hope you enjoy every bite!" },
  "Cancelled":         { emoji: "✖️", color: "#d9534f", bg: "#fdeaea", border: "#f3c6c6", blurb: "Your order has been cancelled. If this wasn't expected, please get in touch with us." },
};

const buildStatusUpdateHtml = (order) => {
  const meta = STATUS_META[order.status] || STATUS_META["Pending"];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update – Mublat Bake &amp; Blends</title>
</head>
<body style="margin:0;padding:30px 10px;background:#f2ede4;font-family:Arial,sans-serif;">

  <table width="620" align="center" cellspacing="0" cellpadding="0"
    style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.10);">

    <tr>
      <td style="background:#111111;padding:36px 40px 30px;text-align:center;">
        ${logoBlock}
        <p style="
          margin: 14px 0 0;
          color: #cccccc;
          font-size: 14px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-family: Arial, sans-serif;
        ">Order Update</p>
      </td>
    </tr>

    <tr>
      <td style="
        background: ${meta.bg};
        padding: 28px 40px;
        border-bottom: 2px solid ${meta.border};
        text-align: center;
      ">
        <p style="margin:0;font-size:22px;font-weight:bold;color:${meta.color};">
          ${meta.emoji} ${order.status}
        </p>
        <p style="margin:8px 0 0;color:#666;font-size:14px;">
          ${meta.blurb}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding: 36px 40px 0;">
        <h3 style="
          margin: 0 0 16px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #999;
          font-family: Arial, sans-serif;
        ">Order Summary</h3>

        <table width="100%" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #f0ece0;">
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;width:40%;">ORDER ID</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;font-weight:bold;">${order.orderId}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">STATUS</td>
            <td style="padding:13px 18px;border-top:1px solid #f5f5f5;">
              <span style="
                background:${meta.bg};
                color:${meta.color};
                font-size:13px;
                font-weight:bold;
                padding:4px 12px;
                border-radius:20px;
                border:1px solid ${meta.border};
              ">${order.status}</span>
            </td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">DELIVERY</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">${order.method}</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">AMOUNT</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;font-weight:bold;border-top:1px solid #f5f5f5;">£${Number(order.totalAmount).toFixed(2)}</td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding: 28px 40px 36px;">
        <div style="
          background: #f9f6ef;
          border-left: 5px solid #d4af37;
          border-radius: 0 10px 10px 0;
          padding: 18px 22px;
        ">
          <p style="margin:0;font-size:14px;color:#666;line-height:1.7;font-family:Arial,sans-serif;">
            🍰 Thank you for choosing <strong style="color:#333;">Mublat Bake &amp; Blends</strong>.
            You'll get another email the next time your order's status changes.
          </p>
        </div>
      </td>
    </tr>

    ${footerBlock}

  </table>

</body>
</html>
`;
};

const sendStatusUpdate = async (order) => {
  try {
    if (!order.email) {
      console.log("Customer has no email address — status update email skipped.");
      return;
    }

    const meta = STATUS_META[order.status] || STATUS_META["Pending"];

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: order.email, name: order.customerName }],
      subject: `${meta.emoji} Order #${order.orderId} — ${order.status}`,
      htmlContent: buildStatusUpdateHtml(order),
    });

    console.log("✅ Status update email sent");
    return result;
  } catch (error) {
    console.error("❌ Status Update Email Error");
    console.error(error);
  }
};

// ─── Support Contact Email ─────────────────────────────────────────────────────

const buildSupportHtml = ({ name, email, topic, message }) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Support Message</title></head>
<body style="margin:0;padding:30px 10px;background:#f2ede4;font-family:Arial,sans-serif;">
  <table width="620" align="center" cellspacing="0" cellpadding="0"
    style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.10);">

    <tr>
      <td style="background:#111;padding:36px 40px 28px;text-align:center;">
        <span style="font-family:Georgia,serif;font-size:30px;font-weight:bold;color:#d4af37;">Mublat</span>
        <span style="font-family:Georgia,serif;font-size:15px;color:#fff;letter-spacing:3px;display:block;margin-top:2px;text-transform:uppercase;">Bake &amp; Blends</span>
        <div style="width:50px;height:2px;background:linear-gradient(to right,transparent,#d4af37,transparent);margin:8px auto 0;"></div>
        <p style="margin:12px 0 0;color:#ccc;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Support Message</p>
      </td>
    </tr>

    <tr>
      <td style="background:linear-gradient(135deg,#1a1a1a,#2a2a2a);padding:20px 40px;text-align:center;border-bottom:2px solid #d4af37;">
        <p style="margin:0;font-size:18px;font-weight:bold;color:#d4af37;">📩 New Support Request</p>
        <p style="margin:6px 0 0;color:#aaa;font-size:13px;">A customer has sent a message through the website</p>
      </td>
    </tr>

    <tr>
      <td style="padding:36px 40px 0;">
        <h3 style="margin:0 0 16px;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#999;">Sender Details</h3>
        <table width="100%" style="border-collapse:collapse;border:1px solid #f0ece0;border-radius:10px;overflow:hidden;">
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;width:30%;">NAME</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;">${name}</td>
          </tr>
          <tr>
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">EMAIL</td>
            <td style="padding:13px 18px;font-size:14px;color:#333;border-top:1px solid #f5f5f5;">
              <a href="mailto:${email}" style="color:#d4af37;">${email}</a>
            </td>
          </tr>
          <tr style="background:#fafafa;">
            <td style="padding:13px 18px;font-size:13px;color:#888;font-weight:bold;border-top:1px solid #f5f5f5;">TOPIC</td>
            <td style="padding:13px 18px;border-top:1px solid #f5f5f5;">
              <span style="background:#fff8e1;color:#e6a817;font-size:13px;font-weight:bold;padding:4px 12px;border-radius:20px;border:1px solid #ffe082;">${topic}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:28px 40px 36px;">
        <h3 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#999;">Message</h3>
        <div style="background:#faf7ef;border-left:5px solid #d4af37;border-radius:0 10px 10px 0;padding:20px 22px;">
          <p style="margin:0;font-size:15px;color:#444;line-height:1.75;white-space:pre-wrap;">${message}</p>
        </div>
        <div style="margin-top:24px;background:#fff8e1;border:1px solid #ffe082;border-left:5px solid #ffc107;border-radius:0 10px 10px 0;padding:16px 20px;">
          <p style="margin:0 0 4px;font-weight:bold;font-size:14px;color:#333;">⚡ Reply directly</p>
          <p style="margin:0;font-size:14px;color:#666;">Hit reply to this email to respond directly to <strong>${name}</strong> at ${email}.</p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="background:#111;padding:28px 40px;text-align:center;border-top:3px solid #d4af37;">
        <p style="margin:0 0 4px;color:#d4af37;font-family:Georgia,serif;font-size:14px;">Mublat Bake &amp; Blends</p>
        <p style="margin:0 0 4px;color:#aaa;font-size:12px;">📍 33 College Garden, BT35 6DR &nbsp;·&nbsp; 📞 +44 7700 000000</p>
        <p style="margin:8px 0 0;color:#555;font-size:11px;">© ${new Date().getFullYear()} Mublat Bake &amp; Blends · All rights reserved</p>
      </td>
    </tr>

  </table>
</body>
</html>
`;

const sendSupportEmail = async ({ name, email, topic, message }) => {
  try {
    if (!process.env.ADMIN_EMAIL) {
      console.log("ADMIN_EMAIL not configured — support email skipped.");
      return;
    }

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender,
      to: [{ email: process.env.ADMIN_EMAIL, name: "Mublat Support" }],
      replyTo: { email, name },   // "Reply" in email client goes straight to customer
      subject: `📩 Support: ${topic} — from ${name}`,
      htmlContent: buildSupportHtml({ name, email, topic, message }),
    });

    console.log("✅ Support email sent to admin");
    return result;
  } catch (error) {
    console.error("❌ Support Email Error");
    console.error(error);
    throw error; // re-throw so controller can return 500
  }
};

module.exports = {
  sendOrderConfirmation,
  sendAdminNotification,
  sendPaymentConfirmation,
  sendStatusUpdate,
  sendSupportEmail,
};
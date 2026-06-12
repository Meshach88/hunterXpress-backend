import { sendEmail } from "./sendEmail.js";

const STATUS_EMAILS = {
  confirmed: (delivery) => ({
    subject: `Order Confirmed - ${delivery.order_reference}`,
    html: `
      <p>Hi there,</p>
      <p>Your payment has been confirmed and your order is now being processed.</p>
      <p><b>Order Reference:</b> ${delivery.order_reference}</p>
      <p><b>Pickup Address:</b> ${delivery.pickup_address?.address || "-"}</p>
      <p><b>Drop-off Address:</b> ${delivery.dropoff_address?.address || "-"}</p>
      <p><b>Package:</b> ${delivery.package_details?.description || "-"}</p>
      <p><b>Price:</b> ${delivery.price}</p>
      <p>We'll notify you as your order progresses.</p>
    `,
  }),
  picked_up: (delivery) => ({
    subject: `Your package has been picked up - ${delivery.order_reference}`,
    html: `
      <p>Hi there,</p>
      <p>Good news! Your courier has picked up your package.</p>
      <p><b>Order Reference:</b> ${delivery.order_reference}</p>
      <p>It's now on its way to: ${delivery.dropoff_address?.address || "-"}</p>
    `,
  }),
  delivered: (delivery) => ({
    subject: `Your package has been delivered - ${delivery.order_reference}`,
    html: `
      <p>Hi there,</p>
      <p>Your package has been delivered.</p>
      <p><b>Order Reference:</b> ${delivery.order_reference}</p>
      <p>Please confirm receipt and rate your courier from your order tracking page.</p>
    `,
  }),
  completed: (delivery) => ({
    subject: `Order Completed - ${delivery.order_reference}`,
    html: `
      <p>Hi there,</p>
      <p>Thanks for confirming receipt of your package.</p>
      <p><b>Order Reference:</b> ${delivery.order_reference}</p>
      <p>We hope to serve you again soon!</p>
    `,
  }),
};

/**
 * Sends a status-update email to the customer for a delivery.
 * Failures are logged but never thrown, so they never block the request flow.
 */
export const sendOrderStatusEmail = async (to, status, delivery) => {
  const template = STATUS_EMAILS[status];
  if (!template || !to) return;

  try {
    const { subject, html } = template(delivery);
    sendEmail(to, subject, html);
  } catch (err) {
    console.error(`Failed to send "${status}" email for order ${delivery.order_reference}:`, err.message);
  }
};

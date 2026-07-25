import axios from "axios";
import crypto from "crypto";
import Delivery from "../models/Delivery.js";
import Courier from "../models/Courier.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { sendOrderStatusEmail } from "../utils/notifications.js";
import { dispatchDelivery } from "../services/dispatchService.js";

// Shared by verifyPayment (client-driven) and the Paystack webhook
// (server-driven) - whichever one observes the successful charge first marks
// the Payment "success"; the other is a no-op via the caller's own
// already-processed check.
const finalizeSuccessfulPayment = async ({ orderId, channel, paid_at }, payment) => {
    if (payment) {
        payment.status = "success";
        payment.channel = channel;
        payment.paid_at = paid_at;
        await payment.save();
    }

    const order = await Delivery.findByIdAndUpdate(orderId, {
        payment_status: "paid",
        delivery_status: "confirmed",
    }, { new: true });

    const customer = await User.findById(order.customer_id);
    sendOrderStatusEmail(customer?.email, "confirmed", order);

    const courier = await dispatchDelivery(order);

    return { order, courier };
};

// ✅ Initialize payment (customer pays for delivery)
export const initializePayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Delivery.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // const courier = await Courier.findById(order.courier_id);
        // if (!courier) return res.status(404).json({message: "Courier not found"})

        // Paystack expects amount in kobo
        const amount = parseInt(order.price * 100);

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: req.user.email,
                amount,
                callback_url: `${process.env.FRONTEND_URL}/welcome/payment/verify?orderId=${order._id}`,
                metadata: {
                    orderId: order._id,
                    customerId: req.user.id,
                    // courierId: courier._id
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const { authorization_url, access_code, reference } = response.data.data;

        await Payment.create({
            delivery_id: order._id,
            customer_id: req.user.id,
            reference,
            amount,
            status: "pending",
        });

        return res.status(200).json({
            authorization_url,
            access_code,
            reference,
        });
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ message: "Payment initialization failed" });
    }
};

// ✅ Verify payment (Paystack callback)
export const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.query;

        const payment = await Payment.findOne({ reference });

        // Already processed - don't re-run the confirm+dispatch side effects
        // a second time for the same transaction (e.g. a duplicate/retried call).
        if (payment && payment.status === "success") {
            return res.json({
                success: true,
                message: "Payment already verified",
            });
        }

        const verifyRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
            }
        );

        const data = verifyRes.data.data;
        // console.log(data);
        if (data.status === "success") {
            const { courier } = await finalizeSuccessfulPayment(
                { orderId: data.metadata.orderId, channel: data.channel, paid_at: data.paid_at },
                payment
            );

            return res.json({
                success: true,
                message: "Payment verified successfully",
                dispatched: !!courier,
            });
        } else {
            if (payment) {
                payment.status = "failed";
                await payment.save();
            }
            return res.json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: "Payment verification failed" });
    }
};

// ✅ Paystack webhook - the reliable backstop to verifyPayment, since it
// fires server-to-server regardless of whether the client ever calls back.
// Trust comes from the signature, not from a logged-in session, so this
// route has no authMiddleware.
export const handlePaystackWebhook = async (req, res) => {
    const signature = req.headers["x-paystack-signature"];

    if (!signature || !req.rawBody) {
        return res.sendStatus(400);
    }

    const expectedSignature = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(req.rawBody)
        .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
        signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
        return res.sendStatus(401);
    }

    // Acknowledge immediately once the signature checks out - Paystack
    // retries on a slow or non-2xx response, and we don't want a hiccup in
    // our own DB writes below to look like a delivery failure on their end.
    res.sendStatus(200);

    try {
        const { event, data } = req.body;

        if (event !== "charge.success" && event !== "charge.failed") return;

        const payment = await Payment.findOne({ reference: data?.reference });

        if (event === "charge.success") {
            if (payment && payment.status === "success") return; // already processed
            await finalizeSuccessfulPayment(
                { orderId: data.metadata?.orderId, channel: data.channel, paid_at: data.paid_at },
                payment
            );
        } else if (payment) {
            payment.status = "failed";
            await payment.save();
        }
    } catch (error) {
        // Response has already been sent - just log for investigation.
        console.error("Paystack webhook processing error:", error.message);
    }
};

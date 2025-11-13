import axios from "axios";
import Delivery from "../models/Delivery.js";

// ✅ Initialize payment (customer pays for delivery)
export const initializePayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Delivery.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Paystack expects amount in kobo
        const amount = order.price * 100;

        const response = await axios.post(
            "https://api.paystack.co/transaction/initialize",
            {
                email: req.user.email,
                amount,
                callback_url: `${process.env.FRONTEND_URL}/welcome/payment/verify?orderId=${order._id}`,
                metadata: {
                    orderId: order._id,
                    customerId: req.user._id,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(200).json({
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
            reference: response.data.data.reference,
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

        const verifyRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
            }
        );

        const data = verifyRes.data.data;
        console.log(data);
        if (data.status === "success") {
            const { orderId } = data.metadata;

            await Delivery.findByIdAndUpdate(orderId, {
                payment_status: "paid",
                delivery_status: "confirmed",
            });

            return res.json({ success: true, message: "Payment verified successfully" });

            // return res.redirect(`${process.env.FRONTEND_URL}/welcome/payment/success`);
        } else {
            return res.json({ success: true, message: "Payment verification failed" });

            // return res.redirect(`${process.env.FRONTEND_URL}/welcome/payment/failed`);
        }
    } catch (error) {
        console.error(error.message);
        return res.json({ success: true, message: "Payment verification failed" });
    }
};

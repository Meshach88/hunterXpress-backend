import axios from "axios";
import Delivery from "../models/Delivery.js";
import Courier from "../models/Courier.js";
import User from "../models/User.js";
import { sendOrderStatusEmail } from "../utils/notifications.js";
import { dispatchDelivery } from "../services/dispatchService.js";

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
        // console.log(data);
        if (data.status === "success") {
            const { orderId } = data.metadata;

            const order = await Delivery.findByIdAndUpdate(orderId, {
                payment_status: "paid",
                delivery_status: "confirmed",
            }, { new: true });

            const customer = await User.findById(order.customer_id);
            sendOrderStatusEmail(customer?.email, "confirmed", order);

            const courier = await dispatchDelivery(order);

            return res.json({
                success: true,
                message: "Payment verified successfully",
                dispatched: !!courier,
            });
        } else {
            return res.json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error(error.message);
        return res.json({ success: false, message: "Payment verification failed" });
    }
};

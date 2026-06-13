import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import { v4 as uuidv4 } from "uuid";
import { dispatchDelivery } from "../services/dispatchService.js";
import Courier from "../models/Courier.js";
import User from "../models/User.js";
import Rating from "../models/Rating.js";
import { sendOrderStatusEmail } from "../utils/notifications.js";

/**
 * @desc Customer creates a new delivery order
 * @route POST /api/deliveries
 */
export const createDelivery = async (req, res) => {
    try {
        // console.log('Delivery request', req.body)
        const { sender, recipient, price, distance_km, estimated_time, photo, delivery_type } = req.body;
        const package_details = JSON.parse(req.body.package_details)
        const pickup_address = JSON.parse(req.body.pickup_address)
        const dropoff_address = JSON.parse(req.body.dropoff_address)

        const order = await Delivery.create({
            order_reference: `ord${uuidv4().replace(/-/g, "").slice(0, 8)}`,
            customer_id: req.user.id,
            sender,
            pickup_address,
            recipient,
            dropoff_address,
            package_details,
            photo_upload: photo,
            price,
            distance_km,
            estimated_time,
            delivery_status: "pending",
            delivery_type
        });


        res.status(201).json({
            success: true,
            message: "Delivery created successfully",
            order,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

export const dispatchOrder = async (req, res) => {

    const { orderId } = req.body;

    try {
        const order = await Delivery.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const courier = await dispatchDelivery(order);

        if (!courier) {
            return res.json({
                success: false,
                message: "No couriers available nearby"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order assigned to a courier",
            data: courier
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'})
    }

}

/**
 * @desc Courier accepts a delivery order
 * @route PATCH /api/deliveries/:id/accept
 */
export const acceptDelivery = async (req, res) => {
    try {
        const { id } = req.params;

        const courier = await Courier.findOne({ user_id: req.user.id });
        if (!courier) return res.status(404).json({ message: "Courier profile not found" });

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.delivery_status !== "assigned" ||
            !delivery.assigned_courier_id ||
            delivery.assigned_courier_id.toString() !== courier._id.toString())
            return res.status(400).json({ message: "Order already accepted or not available" });

        delivery.courier_id = req.user.id;
        delivery.delivery_status = "accepted";
        await delivery.save();

        res.json({ message: "Order accepted successfully", delivery });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc Courier rejects an assigned delivery order, which is then
 * reassigned to the next nearest available courier.
 * @route PATCH /api/deliveries/:id/reject
 */
export const rejectDelivery = async (req, res) => {
    try {
        const { id } = req.params;

        const courier = await Courier.findOne({ user_id: req.user.id });
        if (!courier) return res.status(404).json({ message: "Courier profile not found" });

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.delivery_status !== "assigned" ||
            !delivery.assigned_courier_id ||
            delivery.assigned_courier_id.toString() !== courier._id.toString())
            return res.status(400).json({ message: "Order already accepted or not available" });

        delivery.rejected_couriers.push(courier._id);
        delivery.assigned_courier_id = null;
        delivery.delivery_status = "pending";
        await delivery.save();

        courier.is_available = true;
        courier.current_order_id = null;
        await courier.save();

        const nextCourier = await dispatchDelivery(delivery);

        res.json({
            message: nextCourier
                ? "Order reassigned to another courier"
                : "Order rejected, no other couriers available nearby",
            delivery
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc Courier confirms pickup
 * @route PATCH /api/deliveries/:id/pickup
 */
export const pickupDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const courierId = req.user.id;

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.courier_id.toString() !== courierId.toString())
            return res.status(403).json({ message: "Unauthorized" });

        delivery.delivery_status = "picked_up";
        await delivery.save();

        // io.emit("pickup_confirmed", { deliveryId: id });

        const customer = await User.findById(delivery.customer_id);
        sendOrderStatusEmail(customer?.email, "picked_up", delivery);

        res.json({ message: "Pickup confirmed", delivery });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc Courier completes delivery (with proof)
 * @route PATCH /api/deliveries/:id/complete
 */
export const completeDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const courierId = req.user.id;
        const { signature_url, photo_url } = req.body;

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.courier_id.toString() !== courierId.toString())
            return res.status(403).json({ message: "Unauthorized" });

        delivery.delivery_status = "delivered";
        delivery.proof_of_delivery = { signature_url, photo_url };
        await delivery.save();

        // io.emit("delivery_completed", { deliveryId: id });

        const customer = await User.findById(delivery.customer_id);
        sendOrderStatusEmail(customer?.email, "delivered", delivery);

        res.json({ message: "Delivery completed", delivery });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc Customer confirms receipt of a delivered package, optionally rating the courier
 * @route PATCH /api/deliveries/:id/confirm
 */
export const confirmDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const customerId = req.user.id;
        const { rating, comment } = req.body;

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.customer_id.toString() !== customerId.toString())
            return res.status(403).json({ message: "Unauthorized" });
        if (delivery.delivery_status !== "delivered")
            return res.status(400).json({ message: "Order must be delivered before it can be confirmed" });

        delivery.delivery_status = "completed";
        delivery.confirmed_by_customer = true;
        await delivery.save();

        if (delivery.assigned_courier_id) {
            const courierUpdate = {
                $inc: { total_deliveries: 1 },
                is_available: true,
                current_order_id: null,
            };

            if (rating) {
                await Rating.findOneAndUpdate(
                    { delivery_id: delivery._id },
                    {
                        delivery_id: delivery._id,
                        customer_id: customerId,
                        courier_id: delivery.assigned_courier_id,
                        rating,
                        comment,
                    },
                    { upsert: true, new: true }
                );

                const stats = await Rating.aggregate([
                    { $match: { courier_id: delivery.assigned_courier_id } },
                    { $group: { _id: null, avgRating: { $avg: "$rating" } } },
                ]);

                courierUpdate.rating = stats[0]?.avgRating || rating;
            }

            await Courier.findByIdAndUpdate(delivery.assigned_courier_id, courierUpdate);
        }

        // io.emit("delivery_confirmed", { deliveryId: id });

        const customer = await User.findById(delivery.customer_id);
        sendOrderStatusEmail(customer?.email, "completed", delivery);

        res.json({ message: "Delivery confirmed successfully", delivery });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc Get a single delivery by id (owner only)
 * @route GET /api/deliveries/:id
 * @access Private (Customer)
 */
export const getDeliveryById = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await (mongoose.Types.ObjectId.isValid(id)
            ? Delivery.findById(id)
            : Delivery.findOne({ order_reference: id }))
            .populate("courier_id", "name phone profile_picture");

        if (!delivery) return res.status(404).json({ success: false, message: "Order not found" });
        if (delivery.customer_id.toString() !== req.user.id.toString())
            return res.status(403).json({ success: false, message: "Unauthorized" });

        const order = delivery.toObject();

        if (delivery.courier_id) {
            const courierProfile = await Courier.findOne({ user_id: delivery.courier_id._id })
                .select("rating total_deliveries location location_updated_at");

            if (courierProfile) {
                order.courier_id.rating = courierProfile.rating;
                order.courier_id.total_deliveries = courierProfile.total_deliveries;
                order.courier_id.location = courierProfile.location;
                order.courier_id.location_updated_at = courierProfile.location_updated_at;
            }
        }

        res.status(200).json({ success: true, order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * @desc Get all deliveries for the logged-in customer
 * @route GET /api/deliveries/my-orders
 * @access Private (Customer)
 */
export const getMyDeliveries = async (req, res) => {
    try {
        const deliveries = await Delivery.find({ customer_id: req.user.id })
            .sort({ createdAt: -1 }); // newest first
        // console.log(deliveries);

        res.status(200).json({
            success: true,
            count: deliveries.length,
            deliveries,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch deliveries" });
    }
};


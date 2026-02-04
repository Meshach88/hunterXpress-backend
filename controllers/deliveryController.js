import Delivery from "../models/Delivery.js";
import { v4 as uuidv4 } from "uuid";

/**
 * @desc Customer creates a new delivery order
 * @route POST /api/deliveries
 */
export const createDelivery = async (req, res) => {
    try {
        console.log(req.body);
        const { pickup_address, dropoff_address, price, distance_km } = req.body;
        const package_details = JSON.parse(req.body.package_details)

        const order = await Delivery.create({
            order_reference: `ord${uuidv4().replace(/-/g, "").slice(0, 8)}`,
            customer_id: req.user.id,
            pickup_address,
            dropoff_address,
            package_details,
            price,
            distance_km,
            delivery_status: "pending",
        });

        // Optional: Emit to couriers via Socket.IO here if available
        // io.emit("new_delivery", order);

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

/**
 * @desc Courier accepts a delivery order
 * @route PATCH /api/deliveries/:id/accept
 */
export const acceptDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const courierId = req.user._id;

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.delivery_status !== "pending")
            return res.status(400).json({ message: "Order already accepted or not available" });

        delivery.courier_id = courierId;
        delivery.delivery_status = "accepted";
        await delivery.save();

        // Optional: Notify customer
        // io.emit("delivery_accepted", { deliveryId: id, courierId });

        res.json({ message: "Order accepted successfully", delivery });
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
        const courierId = req.user._id;

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.courier_id.toString() !== courierId.toString())
            return res.status(403).json({ message: "Unauthorized" });

        delivery.delivery_status = "picked_up";
        await delivery.save();

        // io.emit("pickup_confirmed", { deliveryId: id });

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
        const courierId = req.user._id;
        const { signature_url, photo_url } = req.body;

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.courier_id.toString() !== courierId.toString())
            return res.status(403).json({ message: "Unauthorized" });

        delivery.delivery_status = "delivered";
        delivery.proof_of_delivery = { signature_url, photo_url };
        await delivery.save();

        // io.emit("delivery_completed", { deliveryId: id });

        res.json({ message: "Delivery completed", delivery });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * @desc Customer confirms delivery
 * @route PATCH /api/deliveries/:id/confirm
 */
export const confirmDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const customerId = req.user._id;

        const delivery = await Delivery.findById(id);

        if (!delivery) return res.status(404).json({ message: "Order not found" });
        if (delivery.customer_id.toString() !== customerId.toString())
            return res.status(403).json({ message: "Unauthorized" });

        delivery.delivery_status = "confirmed";
        delivery.confirmed_by_customer = true;
        await delivery.save();

        // io.emit("delivery_confirmed", { deliveryId: id });

        res.json({ message: "Delivery confirmed successfully", delivery });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
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
        console.log("getting deliveries");
        console.log(deliveries);

        res.status(200).json({
            count: deliveries.length,
            deliveries,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch deliveries" });
    }
};


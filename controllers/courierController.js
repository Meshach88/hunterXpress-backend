import Courier from "../models/Courier.js";
import Delivery from "../models/Delivery.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

const ALLOWED_DELIVERY_METHODS = ["Bike", "Car", "Van", "Truck"];

export const getCourierData = async (req, res) => {
    try {
        const courierId = req.user.id;

        const courier = await Courier.findOne(
            { user_id: courierId }
        );

        if (!courier) {
            return res.status(404).json({
                success: false,
                message: "Courier profile not found"
            });
        }

        return res.json({
            success: true,
            message: "Courier Data fetched successfully",
            courier
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

export const getCurrentDelivery = async (req, res) => {
    try {
        const courier = await Courier.findOne({ user_id: req.user.id });

        if (!courier) {
            return res.status(404).json({
                success: false,
                message: "Courier profile not found"
            });
        }

        if (!courier.current_order_id) {
            return res.json({ success: true, delivery: null });
        }

        const delivery = await Delivery.findById(courier.current_order_id)
            .populate("customer_id", "name phone email");

        return res.json({ success: true, delivery: delivery || null });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const goOnline = async (req, res) => {
    try {
        const courierId = req.user.id;

        const courier = await Courier.findOne({ user_id: courierId });

        if (!courier) {
            return res.status(404).json({
                success: false,
                message: "Courier profile not found"
            });
        }

        if (!courier.is_verified) {
            return res.status(403).json({
                success: false,
                message: "Your account must be verified before you can go online"
            });
        }

        courier.is_online = true;
        // Not available if they went offline mid-delivery and are now
        // coming back online while still committed to that order.
        courier.is_available = !courier.current_order_id;
        courier.location_updated_at = new Date();
        courier.online_since = new Date();
        await courier.save();

        return res.json({
            success: true,
            message: "Courier is now online",
            courier
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const updateLocation = async (req, res) => {
    try {
        const courierId = req.user.id;
        const { latitude, longitude } = req.body;

        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid coordinates"
            });
        }

        const courier = await Courier.findOneAndUpdate(
            { user_id: courierId },
            {
                location: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                location_updated_at: new Date(),
            },
            { new: true }
        );

        if (!courier) {
            return res.status(404).json({
                success: false,
                message: "Courier profile not found"
            });
        }

        return res.json({
            success: true,
            message: "Location updated",
            location: courier.location
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const goOffline = async (req, res) => {
    try {
        const courierId = req.user.id;

        const courier = await Courier.findOneAndUpdate(
            { user_id: courierId },
            {
                is_online: false,
                is_available: false,
                online_since: null
            },
            { new: true }
        );

        if (!courier) {
            return res.status(404).json({
                success: false,
                message: "Courier profile not found"
            });
        }

        return res.json({
            success: true,
            message: "Courier is now offline",
            courier
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const updateCourierProfile = async (req, res) => {
    try {
        const { deliveryMethod, plateNumber, model, color, payoutMethod, bankName, accountNumber, address } = req.body;

        if (deliveryMethod && !ALLOWED_DELIVERY_METHODS.includes(deliveryMethod)) {
            return res.status(400).json({ success: false, message: "Invalid delivery method" });
        }

        const updates = {};
        if (deliveryMethod !== undefined) updates.deliveryMethod = deliveryMethod;
        if (plateNumber !== undefined) updates.plateNumber = plateNumber;
        if (model !== undefined) updates.model = model;
        if (color !== undefined) updates.color = color;
        if (payoutMethod !== undefined) updates.payoutMethod = payoutMethod;
        if (bankName !== undefined) updates.bankName = bankName;
        if (accountNumber !== undefined) updates.accountNumber = accountNumber;

        if (address !== undefined) {
            updates.address = address;

            // A verified courier changing their stated address invalidates
            // what was actually reviewed - require re-verification rather
            // than silently keeping the old "Verified" status.
            const existingCourier = await Courier.findOne({ user_id: req.user.id }).select("address is_verified");
            if (existingCourier?.is_verified && address !== existingCourier.address) {
                updates.is_verified = false;
            }
        }

        const validIdFile = req.files?.validId?.[0];
        const proofFile = req.files?.proofOfAddress?.[0];

        let validIdUpload, proofUpload;
        if (validIdFile) validIdUpload = await uploadToCloudinary(validIdFile.buffer);
        if (proofFile) proofUpload = await uploadToCloudinary(proofFile.buffer);

        if (validIdUpload) updates.validId = validIdUpload.secure_url;
        if (proofUpload) updates.proofOfAddress = proofUpload.secure_url;

        const courier = await Courier.findOneAndUpdate(
            { user_id: req.user.id },
            updates,
            { new: true }
        );

        if (!courier) {
            if (validIdUpload) await cloudinary.uploader.destroy(validIdUpload.public_id);
            if (proofUpload) await cloudinary.uploader.destroy(proofUpload.public_id);

            return res.status(404).json({
                success: false,
                message: "Courier profile not found"
            });
        }

        return res.json({
            success: true,
            message: "Profile updated successfully",
            courier
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
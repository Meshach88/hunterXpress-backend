import Courier from "../models/Courier.js";
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

export const goOnline = async (req, res) => {
    try {
        const courierId = req.user.id;

        const courier = await Courier.findOneAndUpdate(
            { user_id: courierId },
            {
                is_online: true,
                is_available: true, // also check if the courier is handling a delivery
                location_updated_at: new Date()
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
            message: "Courier is now online",
            // data: courier
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
                is_available: false
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
            // data: courier
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
        const { deliveryMethod, plateNumber, model, color, payoutMethod, bankName, accountNumber } = req.body;

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
import Courier from "../models/Courier.js";

export const goOnline = async (req, res) => {
    try {
        const courierId = req.user.id; // assuming auth middleware

        const courier = await Courier.findOneAndUpdate(
            { user_id: courierId },
            {
                is_online: true,
                is_available: true,
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
            data: courier
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

        return res.json({
            success: true,
            message: "Courier is now offline",
            data: courier
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
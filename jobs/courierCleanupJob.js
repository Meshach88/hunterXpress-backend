import Courier from "../models/Courier.js";

export const cleanupInactiveCouriers = async () => {

    try {

        const cutoff = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes

        const result = await Courier.updateMany(
            {
                is_online: true,
                location_updated_at: { $lt: cutoff }
            },
            {
                $set: {
                    is_online: false,
                    is_available: false
                }
            }
        );

        console.log(`Inactive couriers updated: ${result.modifiedCount}`);

    } catch (error) {

        console.error("Courier cleanup error:", error);

    }

};
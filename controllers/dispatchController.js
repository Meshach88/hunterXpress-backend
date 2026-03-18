import Courier from "../models/Courier.js";

export const findNearbyCouriers = async (req, res) => {

    try {

        const { latitude, longitude } = req.body;

        const freshnessLimit = new Date(Date.now() - 30000);

        const couriers = await Courier.find({

            is_online: true,
            is_available: true,

            location_updated_at: {
                $gte: freshnessLimit
            },

            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude]
                    },
                    $maxDistance: 5000
                }
            }

        }).limit(5);

        return res.json({
            success: true,
            couriers
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false
        });

    }

};
import { getNearbyCouriers } from "../services/dispatchService.js";

export const findNearbyCouriers = async (req, res) => {

    try {

        const { latitude, longitude } = req.body;

        const couriers = await getNearbyCouriers(latitude, longitude);

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
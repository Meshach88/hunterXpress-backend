import { courierSockets } from "../sockets/courierSocket.js";
import { io } from "../index.js";
import Courier from "../models/Courier.js";
import { dispatchResponses } from "../events/dispatchEvents.js";

const NEARBY_RADIUS_METERS = 5000;
const NEARBY_FRESHNESS_MS = 30000;
const NEARBY_LIMIT = 5;

export const getNearbyCouriers = async (latitude, longitude) => {
    const freshnessLimit = new Date(Date.now() - NEARBY_FRESHNESS_MS);

    return Courier.find({
        is_online: true,
        is_available: true,
        location_updated_at: { $gte: freshnessLimit },
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude]
                },
                $maxDistance: NEARBY_RADIUS_METERS
            }
        }
    }).limit(NEARBY_LIMIT);
};

export const dispatchDelivery = async (order, couriers) => {

    for (const courier of couriers) {

        const socketId = courierSockets.get(courier._id.toString());

        if (!socketId) continue;

        console.log("Sending order to courier:", courier._id);

        io.to(socketId).emit("new_delivery_request", {
            order
        });

        const accepted = await waitForCourierResponse(order._id, courier._id);

        if (accepted) {
            order.courier_id = courier._id;
            await order.save();
            console.log("Courier accepted order");
            return true;
        }
    }

    console.log("No courier accepted the order");
    return false;
};

const waitForCourierResponse = (orderId, courierId) => {

    return new Promise((resolve) => {

        const timeout = setTimeout(() => {
            resolve(false);
        }, 10000);

        dispatchResponses.once(`${orderId}_${courierId}`, (accepted) => {

            clearTimeout(timeout);

            resolve(accepted);

        });

    });

};
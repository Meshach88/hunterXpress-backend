import Courier from "../models/Courier.js";

const NEARBY_RADIUS_METERS = 5000;
const NEARBY_FRESHNESS_MS = 30000;
const NEARBY_LIMIT = 5;

export const getNearbyCouriers = async (latitude, longitude, excludeIds = []) => {
    const freshnessLimit = new Date(Date.now() - NEARBY_FRESHNESS_MS);

    return Courier.find({
        _id: { $nin: excludeIds },
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

/**
 * Assigns the order to the nearest available courier.
 * Returns the assigned courier, or null if none are available.
 */
export const dispatchDelivery = async (order) => {

    const couriers = await getNearbyCouriers(
        order.pickup_address.lat,
        order.pickup_address.lng,
        order.rejected_couriers
    );

    console.log('Couriers found', couriers);

    if (!couriers.length) return null;

    const courier = couriers[0];

    order.assigned_courier_id = courier._id;
    order.delivery_status = "assigned";
    await order.save();

    courier.is_available = false;
    courier.current_order_id = order._id;
    await courier.save();

    return courier;
};

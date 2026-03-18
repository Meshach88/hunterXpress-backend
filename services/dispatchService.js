import { courierSockets } from "../sockets/courierSocket.js";
import { io } from "../index.js";
import Courier from "../models/Courier.js";
import { dispatchResponses } from "../events/dispatchEvents.js";

export const dispatchDelivery = async (order, couriers) => {

    // const couriers = await findNearbyCouriers(order);
    
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
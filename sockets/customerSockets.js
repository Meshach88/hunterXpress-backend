import Customer from "../models/Customer.js";
import { dispatchResponses } from "../events/dispatchEvents.js";


// store active customer sockets
export const customerSockets = new Map();

export const customerSocketHandler = (io, socket) => {

    console.log("Customer connected:", socket.id);

    /**
     * Register customer
     */
    socket.on("register_customer", ({ customerId }) => {

        if (!customerId) return;

        // attach customerId to socket
        socket.customerId = customerId;

        // store socket mapping
        customerSockets.set(customerId, socket.id);

        console.log("Customer registered:", customerId);

    });

    /**
     * Handle courier disconnect
     */
    socket.on("disconnect", () => {

        console.log("Customer disconnected:", socket.id);

        if (socket.customerId) {

            customerSockets.delete(socket.customerId);

            console.log("Customer removed from active sockets:", socket.customerId);

        }

    });

};
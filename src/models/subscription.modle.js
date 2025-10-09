import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  // one who is subscribing
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",  // one who is being subscribed to
    }
},
{timestamps: true});


export const Subscription = mongoose.model("Subscription", subscriptionSchema);

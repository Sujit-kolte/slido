// backend/models/Event.js
//for slido clone

import mongoose from "mongoose";
const evenSchema =new mongoose.Schema(
    {
        title:{
            type:String,
            required:true
        },
        description:{
            type:String,
            required:true
        },
        eventcode:{
            type:String,
            required:true,
            unique:true
        },
        status:{
            type:String,
            required:true
        },
        createdAt:{
            type:Date,
            default:Date.now
        },
        startTime:{
            type:Date,
        },
        endTime:{
            type:Date,
        },
    },
);
const Event=mongoose.model("Event",evenSchema);
export default Event;
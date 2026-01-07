//backend//models//pollsc.js
//for slido clone

const pollSchema = new mongoose.Schema({
    eventID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    pollQuestion: {
        type: String,
        required: true,
    },
    options: [{
        optionText: {
            type: String,
            required: true,
        },
        votes: {
            type: Number,
            default: 0,
        }
    }],
    status: {
        type: String,
        required: true,
    },
}, { timestamps: true });

const Poll = mongoose.model("Poll", pollSchema);
export default Poll;
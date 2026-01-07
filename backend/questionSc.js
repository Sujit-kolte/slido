//backend//models//schemaques.js
//for slido clone
const quesSchema =new mongoose.Schema(
    {
        eventID:{
            tyoe:mongoose.Schema.Types.ObjectId,
            ref:"Event",
            required:true
        },
        questionText:{
            type:String,
            required:true
        },
        upvotes:{
            type:Number,
            default:0
        },
        isAns:{
            type:Boolean,
            default:false
        },
        status:{
            type:String,
            required:true
        },
    },
    {timestamps: true}
);
const Question=mongoose.model("Question",quesSchema);
export default Question;
const { Schema, model } = require("mongoose");

const a2aSchema = new Schema(
    {  
        
        airportFrom: {
            type: Schema.Types.ObjectId,
            ref: "Airport",
            required: true,
        },
        airportTo: {
            type: Schema.Types.ObjectId,
            ref: "Airport",
            required: true,

        },
        isDeleted : {
            type : Boolean,
            default : false
        },
        isActive : {
            type : Boolean,
            default : true
        }
    },
    { timestamps: true })
    


    const B2BA2a = model(
        "B2BA2a",
        a2aSchema
    );
    
    module.exports = B2BA2a;
const { Schema, model } = require("mongoose")

const getInTouchSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
)

const GetInTouchModel = model( "GetInTouch", getInTouchSchema )
module.exports = GetInTouchModel
const mongoose = require("mongoose")
const slug = require("mongoose-slug-generator")
const { Schema, model } = require('mongoose')

mongoose.plugin(slug)

const attractionStandAloneSchema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        images: {
            type: [{ type: String, required:true}]
        },
        attraction: {
            type: [{type: Schema.Types.ObjectId, ref:"Attraction" , required: true}]
        },
        slug: {
            type: String,
            slug: ["title"],
            unique: true
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        }
    },
    {
        timestamps: true
    }
)

const AttractionStandAlone = model("AttractionStandAlone", attractionStandAloneSchema)

module.exports = AttractionStandAlone
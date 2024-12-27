const { Schema, model } = require("mongoose");

const groupAreaSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    areas: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "Area",
                required: true,
            },
        ],
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true,
    },
});

const GroupArea = model("GroupArea", groupAreaSchema);

module.exports = GroupArea;

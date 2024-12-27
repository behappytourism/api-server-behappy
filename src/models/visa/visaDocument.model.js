const { Schema, model } = require("mongoose");

const visaDocumentSchema = new Schema(
    {
        passportFistPagePhoto: {
            type: String,
            required: true,
        },

        passportLastPagePhoto: {
            type: String,
            required: true,
        },
        passportSizePhoto: {
            type: String,
        },
        supportiveDoc1: {
            type: String,
        },
        supportiveDoc2: {
            type: String,
        },
    },
    { timestamps: true }
);

const VisaDocument = model("VisaDocument", visaDocumentSchema);

module.exports = VisaDocument;

const { Schema, model } = require("mongoose");

const tourPackageThemeSchema = new Schema(
    {
        themeIcon: {
            type: String,
        },
        themeName: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const TourPackageTheme = model("TourPackageTheme", tourPackageThemeSchema);

module.exports = TourPackageTheme;

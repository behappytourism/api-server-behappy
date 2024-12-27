const { Schema, model } = require("mongoose");

const adminRoleSchema = new Schema(
    {
        roleName: {
            type: String,
            required: true,
        },
        roles: {
            type: [
                {
                    name: { type: String, required: true, lowercase: true },
                    displayName: { type: String, required: true },
                    category: { type: String, required: true, lowercase: true },
                    permissions: [],
                },
            ],
        },
    },
    { timestamps: true, strict: false }
);

adminRoleSchema.virtual("adminsCount", {
    ref: "Admin",
    localField: "_id",
    foreignField: "roles",
    count: true,
});

const AdminRole = model("AdminRole", adminRoleSchema);

module.exports = AdminRole;

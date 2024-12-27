const { Types, ObjectID } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { Transfer, Airport, GroupArea } = require("../../../models");
const { Area, City } = require("../../../models/global");
const { isValidObjectId } = require("mongoose");

module.exports = {
    getAreas: async (req, res) => {
        try {
            const areas = await Area.find({
                isDeleted: false,
                country: "63ac33ecff04e5652a2583f5",
                areaName: { $exists: true },
            }).sort({ areaName: 1 });

            // const groups = await GroupArea.find({ isDeleted: false });

            // let groupedAreas = groups
            //     .map((group) => group.areas)
            //     .flat(1)
            //     .map(String);

            // let filteredAreas = areas.filter((area) => {
            //     return !groupedAreas.some((gpArea) => gpArea.toString() === area._id.toString());
            // });

            res.status(200).json({ areas: areas });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addGroupArea: async (req, res) => {
        try {
            const { name, areas } = req.body;

            // const groups = await GroupArea.find();

            // if (groups.length > 0) {
            //     for (let i = 0; i < groups.length; i++) {
            //         let group = groups[i];

            //         let selectedArea = group.areas.find((area) => areas.some((ae) => ae === area));

            //         if (selectedArea) {
            //             return sendErrorResponse(
            //                 res,
            //                 400,
            //                 "area already added in some other group"
            //             );
            //         }
            //     }
            // }

            const groupArea = await GroupArea({
                name,
                areas,
            });

            await groupArea.save();

            res.status(200).json({ id: groupArea._id, message: "Group Area Added Successfully" });
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    listAllGroups: async (req, res) => {
        try {
            const { skip = 0, limit = 10, groupName } = req.query;

            let filters1 = {};

            if (groupName && groupName !== "") {
                filters1.name = { $regex: groupName, $options: "i" };
            }

            const groups = await GroupArea.find({ isDeleted: false, ...filters1 })
                .sort({
                    createdAt: -1,
                })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            if (!groups) {
                return sendErrorResponse(res, 400, "No groups found  ");
            }

            const total = await GroupArea.find({
                isDeleted: false,
            }).count();

            res.status(200).json({
                groups,
                total,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    singleGroupArea: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid group id");
            }

            const groupAreas = await Area.find({
                isDeleted: false,
                country: "63ac33ecff04e5652a2583f5",
                areaName: { $exists: true },
            });
            if (!groupAreas) {
                return sendErrorResponse(res, 400, "No group found  ");
            }

            const group = await GroupArea.findOne({ _id: id, isDeleted: false });

            res.status(200).json({ group: group, areas: groupAreas });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateGroupArea: async (req, res) => {
        try {
            const { id } = req.params;

            const { name, areas } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid group id");
            }

            const group = await GroupArea.findByIdAndUpdate(
                id,
                {
                    name,
                    areas,
                },
                { runValidators: true, new: true }
            );

            if (!group) {
                return sendErrorResponse(res, 400, "No group found  ");
            }

            res.status(200).json({ message: "Group has been updated", _id: group._id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteGroupArea: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid group id");
            }

            const group = await GroupArea.findByIdAndUpdate(
                id,
                {
                    isDeleted: true,
                },
                { runValidators: true, new: true }
            );

            if (!group) {
                return sendErrorResponse(res, 400, "No group found  ");
            }

            res.status(200).json({
                message: "Group has been deleted successfully ",
                _id: group._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};

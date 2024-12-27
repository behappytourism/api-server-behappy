const { sendErrorResponse } = require("../../helpers");
const { Attraction, Destination, AttractionStandAlone } = require("../../models");

module.exports = {
    searchDestinationAndAtt: async (req, res) => {
        try {
            let { search } = req.query;

            let filters1 = { isDeleted: false, isB2cActive: true };
            if (search && search !== "") {
                filters1.title = { $regex: search, $options: "i" };
            }

            let filters2 = { isDeleted: false };
            if (search && search !== "") {
                filters2.name = { $regex: search, $options: "i" };
            }

            let attractions = await Attraction.find(filters1).select("title slug").populate({
                path: "destination",
                select: "name slug",
            });
            let totoalAttraction = attractions.length;

            let destinations = await Destination.find(filters2).select("name slug");

            if (!search || search == "") {
                const attractionDestinationIds = attractions.map((attraction) =>
                    attraction?.destination?._id.toString()
                );

                let filteredDestination = await destinations.filter((destination) => {
                    return attractionDestinationIds.includes(destination?._id.toString());
                });
                destinations = filteredDestination;
            }

            let totalDestination = destinations.length;

            let standAlone = await AttractionStandAlone.find({
                isActive: true,
                isDeleted: false,
                attraction: {
                    $in: await Attraction.find(filters1).distinct("_id"),
                },
            })
                .populate({
                    path: "attraction",
                    model: "Attraction",
                    select: " _id title description images slug itineraryDescription ",
                    populate: {
                        path: "destination",
                        model: "Destination",
                    },
                })
                .exec();
            let totalStandAlone = standAlone?.length;

            res.status(200).json({
                attractions,
                totoalAttraction,
                destinations,
                totalDestination,
                standAlone,
                totalStandAlone,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};

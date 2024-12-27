const { isValidObjectId } = require("mongoose");
const moment = require("moment");

const { Vehicle, VehicleSchedule } = require("../../../models/transfer");

const checkVehicleAvailable = ({ vehicleId, bufferedFromISODateTime, bufferedToISODateTime }) => {
    return new Promise(async (resolve, reject) => {
        if (!isValidObjectId(vehicleId)) {
            reject("invalid vehicle id");
        }
        const vehicle = await Vehicle.findOne({ _id: vehicleId }).lean();
        if (!vehicle) {
            reject("vehicle not found");
        }

        console.log(
            "moment bufferedFromISODateTime",
            moment(bufferedFromISODateTime).toISOString()
        );

        // find vehicle schedules b/w from and to dates
        const vehicleSchedules = await VehicleSchedule.find({
            vehicleId,
            bufferedFromISODateTime: {
                $gte: moment(bufferedFromISODateTime).toISOString(),
                $lte: moment(bufferedToISODateTime).toISOString(),
            },
            isDeleted: false,
        }).lean();
        for (let schedule of vehicleSchedules) {
            // 2024-01-03 01.10
            // 2024-01-02 11.15 PM - 2024-01-03 01.20 AM
            if (
                (moment(bufferedFromISODateTime).isSameOrAfter(schedule.bufferedFromISODateTime) &&
                    moment(bufferedFromISODateTime).isSameOrBefore(
                        schedule.bufferedToISODateTime
                    )) ||
                (moment(bufferedToISODateTime).isSameOrAfter(schedule.bufferedFromISODateTime) &&
                    moment(bufferedToISODateTime).isSameOrBefore(schedule.bufferedToISODateTime))
            ) {
                resolve(false);
            }
        }

        resolve(true);
    });
};

module.exports = checkVehicleAvailable;

const moment = require("moment");

function getFormatedDuration(start, end) {
    const startDate = moment(start);
    const endDate = moment(end);

    const duration = moment.duration(endDate.diff(startDate));

    const hours = duration.asHours().toString().split(".")[0];
    const minutes = duration.minutes();

    return `${hours}h ${minutes}min`;
}

module.exports = getFormatedDuration;

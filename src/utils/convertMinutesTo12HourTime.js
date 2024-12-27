function convertMinutesTo12HourTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;

    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;

    const timeString = `${formattedHours}:${remainderMinutes
        .toString()
        .padStart(2, "0")} ${period}`;

    return timeString;
}

module.exports = convertMinutesTo12HourTime;

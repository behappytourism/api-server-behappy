const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
];

const getDayName = (date) => {
    const selectedDay = dayNames[new Date(date).getDay()];

    return selectedDay || "";
};

module.exports = getDayName;

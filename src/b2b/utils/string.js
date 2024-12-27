function extractRoomCategoryInfo(roomName) {
    if (roomName) {
        // Define regular expressions to extract room type and count
        const typeRegex = /(Single|Double|Twin|Twins|Bedroom|Queen|King)\b/i;
        const countRegex = /\b(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+)\b/i; // Updated regex to include textual representations

        const typeShortNames = {
            Single: "SGL",
            Double: "DBL",
            Twin: "TWN",
            Twins: "TWNS",
            Bedroom: "BED",
            Queen: "Q",
            King: "K",
        };

        const DIGITS = {
            One: "1",
            Two: "2",
            Three: "3",
            Four: "4",
            Five: "5",
            Six: "6",
            Seven: "7",
            Eight: "8",
            Nine: "9",
            Ten: "10",
        };

        // Extract room type
        const typeMatch = roomName?.match(typeRegex);
        const type = typeMatch ? typeMatch[0] : "Unknown";
        const typeShort = typeMatch ? typeShortNames[typeMatch[0]] : "Unknown";

        // Extract bed count
        const countMatch = roomName?.match(countRegex);
        const count = countMatch
            ? parseInt(DIGITS[countMatch[0]] ? DIGITS[countMatch[0]] : countMatch[0])
            : 1;

        // Remove bed type and count from room name
        const cleanedRoomName = roomName
            ?.replace(typeRegex, "")
            ?.replace(countRegex, "")
            ?.replace(/\s+/g, " ")
            ?.trim();

        return {
            roomName: cleanedRoomName,
            bed: {
                type: type,
                typeShort: typeShort,
                count: count,
            },
        };
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
    extractRoomCategoryInfo,
    capitalizeFirstLetter,
};

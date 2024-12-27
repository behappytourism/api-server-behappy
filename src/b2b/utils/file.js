const fs = require("fs");

function setNestedFieldValue(json, fieldPath, value) {
    const keys = fieldPath.split(".");
    let nestedObj = json;
    if (keys && keys.length) {
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in nestedObj)) {
                nestedObj[key] = {};
            }
            nestedObj = nestedObj[key];
        }
        nestedObj[keys[keys.length - 1]] = value;
    } else {
        nestedObj[fieldPath] = value;
    }
}

function addToJsonNestedFields(arrayOfIds, field, filePath) {
    try {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File '${filePath}' does not exist.`);
        }

        // Read the JSON file
        let jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

        // Add the array of IDs to the JSON data
        setNestedFieldValue(jsonData, field, arrayOfIds);

        // Write the modified JSON back to the file
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

        // Return the modified JSON
        return jsonData;
    } catch (error) {
        console.error("Error:", error.message);
        return null; // Return null to indicate failure
    }
}

function addIdsToJsonFile(filePath, arrayOfIds) {
    try {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File '${filePath}' does not exist.`);
        }

        // Read the JSON file
        let jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

        // Add the array of IDs to the JSON data
        jsonData.profileIds = arrayOfIds;

        // Write the modified JSON back to the file
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));

        // Return the modified JSON
        return jsonData;
    } catch (error) {
        console.error("Error:", error.message);
        return null; // Return null to indicate failure
    }
}

module.exports = {
    addToJsonNestedFields,
    addIdsToJsonFile,
};

const generateUniqueString = (prefix) => {
    let min = 100;
    let max = 999;
    let result = "";

    if (prefix) {
        result += prefix + "_";
    }

    result += new Date().getTime() + Math.floor(Math.random() * (max - min + 1) + min);

    return result;
};

module.exports = generateUniqueString;

const checkDateDefaultValidations = (data, sellFrom, sellTo) => {
    for (var i = 0; i < data.length; i++) {
        if (
            new Date(data[i].fromDate) > new Date(data[i].toDate) ||
            new Date(data[i].fromDate) < new Date(sellFrom) ||
            new Date(data[i].toDate) > new Date(sellTo)
        ) {
            return false;
        }
    }

    return true;
};

module.exports = {
    checkDateDefaultValidations,
};

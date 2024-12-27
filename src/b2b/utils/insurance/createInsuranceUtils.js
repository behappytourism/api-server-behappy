const createInsurnacePlansUtils = (generalData, beneficiaryData) => {
    try {
        const data = {
            businessLine: "travel",
            contractType: generalData.travelType,
            agency: process.env.CYGNET_AGENCY,
            countryOfResidence: "ARE",
            destinations: [
                {
                    countrycode: generalData.destination,
                    startperiod: generalData.travelFrom,
                    endperiod: generalData.travelTo,
                },
            ],
            beneficiaries: beneficiaryData.map((benData, index) => {
                return {
                    borndate: benData.dateOfBirth,
                    beneficiaryType: index === 0 ? "01" : "03",
                };
            }),
        };

        return data;
    } catch (err) {
        console.log(err);
    }
};

module.exports = createInsurnacePlansUtils;

const getInsurnacePlans = (category) => {
    try {
        const data = {
            businessLine: "travel",
            contractType: "SG",
            agency: "4",
            countryOfResidence: "UAE",
            destinations: [
                {
                    countrycode: "IND",
                    startperiod: "30-08-2023",
                    endperiod: "30-09-2023",
                },
            ],
            beneficiaries: [
                {
                    borndate: "1988-12-26",
                    beneficiaryType: "01",
                },
                // {
                //     borndate: "1990-12-26",
                //     beneficiaryType: "03",
                // },
            ],
        };

        return data;
    } catch (err) {
        console.log(err);
    }
};

module.exports = getInsurnacePlans;

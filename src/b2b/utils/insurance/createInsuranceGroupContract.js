const createInsurnaceGroupContractUtils = (insuranceContract, plan, discount, duration) => {
    try {
        const data = {
            businessLine: "travel",
            type: "FM",
            agency: process.env.CYGNET_AGENCY,
            assistance_plan: plan,
            residence: "ARE",
            email: "excursion@travellerschoice.ae",
            phonenumber: insuranceContract?.phoneNumber,
            phonecode: insuranceContract?.phoneCode,
            address: insuranceContract?.address,
            notes: insuranceContract?.note,
            destination: [insuranceContract?.destination],
            from: insuranceContract?.travelFrom,
            to: insuranceContract?.travelTo,
            duration: duration,
            fname: insuranceContract?.beneficiaryData?.map((benfData) => {
                return benfData?.firstName;
            }),
            mdname: insuranceContract.beneficiaryData.map((benfData) => {
                return "";
            }),
            mnname: insuranceContract.beneficiaryData.map((benfData) => {
                return "";
            }),
            lname: insuranceContract.beneficiaryData.map((benfData) => {
                return benfData.lastName;
            }),
            passno: insuranceContract.beneficiaryData.map((benfData) => {
                return benfData.passportNumber;
            }),
            dob: insuranceContract.beneficiaryData.map((benfData) => {
                return benfData.dateOfBirth;
            }),
            gender: insuranceContract.beneficiaryData.map((benfData) => {
                return benfData.gender === "Male" ? "M" : "F";
            }),
            riders: insuranceContract.beneficiaryData.map((benfData) => {
                return "";
            }),
            plans_price: [
                insuranceContract.beneficiaryData.map((benfData) => {
                    return benfData.priceId;
                }),
            ],
            plans_discount: [
                insuranceContract.beneficiaryData.map((benfData) => {
                    return 0;
                }),
            ],
            plans_all: [plan],
        };
        return data;
    } catch (err) {
        console.log(err);
    }
};

module.exports = createInsurnaceGroupContractUtils;

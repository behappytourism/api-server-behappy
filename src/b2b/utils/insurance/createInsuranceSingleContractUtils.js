const createInsurnaceSingleContractUtils = (insuranceContract, price, plan, discount, duration) => {
    try {
        const data = {
            businessLine: "travel",
            type: "SG",
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
            sgender: insuranceContract.beneficiaryData[0].gender === "MALE" ? "M" : "F",
            first_name: insuranceContract.beneficiaryData[0].firstName,
            middle_name: "",
            maiden_name: "",
            last_name: insuranceContract.beneficiaryData[0].lastName,
            passport_no: insuranceContract.beneficiaryData[0].passportNumber,
            date_of_birth: insuranceContract.beneficiaryData[0].dateOfBirth,
            rider: "",
            plans_price: [[price]],
            plans_discount: [[discount]],
            plans_all: [plan],
        };

        return data;
    } catch (err) {
        console.log(err);
    }
};

module.exports = createInsurnaceSingleContractUtils;

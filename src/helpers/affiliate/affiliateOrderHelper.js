const { AffiliateUser, AffiliateActivity, AffiliatePointHistory } = require("../../models");

const AffilaiteCheckHelper = async (req, selectedActivities, orderId) => {
    try {
        if (req?.cookies?.affiliateCode) {
            console.log(req?.cookies?.affiliateCode, "req?.cookies?.affiliateCode");

            let affilateUser = await AffiliateUser.findOne({
                affiliateCode: req?.cookies?.affiliateCode,
                isActive: true,
            });

            if (!affilateUser) {
                return 0;
            }

            let totalPoints = 0;
            for (let i = 0; i < selectedActivities.length; i++) {
                let affiliateActivity = await AffiliateActivity.findOne({
                    activityId: selectedActivities[i]?.activity,
                    isActive: true,
                });

                if (affiliateActivity) {
                    totalPoints +=
                        selectedActivities[i].adultsCount * affiliateActivity.adultPoint +
                        selectedActivities[i].childrenCount * affiliateActivity.childPoint;
                }
            }

            console.log(totalPoints, "totalPoints");

            const newAffliliateHIstory = new AffiliatePointHistory({
                user: affilateUser.user,
                points: totalPoints,
                previousPoints: affilateUser.totalPoints,
                transactionType: "attraction",
                attractionOrder: orderId,
                status: "pending",
            });

            await newAffliliateHIstory.save();

            return 1;
        } else {
            return 0;
        }
    } catch (e) {
        console.log(e, "error");
    }
};

const completeAffiliatePoints = async (req, orderId) => {
    try {
        let affilateUser = await AffiliateUser.findOne({
            user: req?.user?._id,
            isActive: true,
        });

        if (!affilateUser) {
            return 0;
        }

        const affiliatePointHistory = await AffiliatePointHistory.findOne({
            attractionOrder: orderId,
            status: "pending",
        });
        if (!affiliatePointHistory) {
            return 0;
        }

        affiliatePointHistory.status = "success";
        await affiliatePointHistory.save();

        affilateUser.totalPoints += Number(affiliatePointHistory.points);
        await affilateUser.save();

        return 1;
    } catch (err) {
        console.log(err);
    }
};

module.exports = { AffilaiteCheckHelper, completeAffiliatePoints };

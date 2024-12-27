const { B2BAttractionOrder, B2BA2aOrder } = require("../../../b2b/models");
const { B2bHotelOrder } = require("../../../b2b/models/hotel");
const { sendMessageHelper } = require("../../../config/whatsappConfig");
const {
    VisaApplication,
    B2CVisaApplication,
    WhatsappManagement,
    AttractionOrder,
} = require("../../../models");

const completeProfitDetailWhatsappHelper = async () => {
    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const whatsappManagment = await WhatsappManagement.findOne({
            name: "admin",
            status: true,
        });

        function formatDate(date) {
            let day = date.getDate();
            let month = date.getMonth() + 1; // Month is zero-based, so we add 1
            let year = date.getFullYear();

            // Pad single-digit day and month with leading zeros
            let formattedDay = day < 10 ? "0" + day : day;
            let formattedMonth = month < 10 ? "0" + month : month;

            // Return the formatted date string in the format DD/MM/YYYY
            return formattedDay + "/" + formattedMonth + "/" + year;
        }

        let date = formatDate(yesterday); // "20/10/2024"
        let totalPrice = 0;
        let totalCost = 0;
        let totalProfit = 0;
        let totalOrders = 0;

        let attractionTotalPrice = 0;
        let attractionTotalCost = 0;
        let attractionTotalProfit = 0;
        let attractionTotalOrders = 0;

        const attractionOrders = await B2BAttractionOrder.find({
            createdAt: {
                $gte: new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate(),
                    0,
                    0,
                    0
                ), // Start of yesterday
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), // Start of today
            },
            orderStatus: "completed",
        });
        attractionOrders.forEach((order) => {
            order.activities.forEach((activity) => {
                attractionTotalPrice += activity.grandTotal;
                attractionTotalCost += activity.totalCost;
                attractionTotalProfit += activity.profit;
            });
            attractionTotalOrders += 1;
        });

        // if (whatsappManagment) {
        //     await sendMessageHelper({
        //         type: "message",
        //         number: `${whatsappManagment?.phoneCode}${whatsappManagment?.phoneNumber}`,
        //         message: `Total B2B Attraction Order Details \n Date : ${date} \n TotalOrders : ${attractionTotalOrders} \n TotalPrice : ${attractionTotalPrice} \n TotalCost : ${attractionTotalCost} \n TotalProfit : ${attractionTotalProfit}`,
        //     });
        // }

        let b2cattractionTotalPrice = 0;
        let b2cattractionTotalCost = 0;
        let b2cattractionTotalProfit = 0;
        let b2cattractionTotalOrders = 0;
        const b2cattractionOrders = await AttractionOrder.find({
            createdAt: {
                $gte: new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate(),
                    0,
                    0,
                    0
                ), // Start of yesterday
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), // Start of today
            },
            orderStatus: "completed",
        });
        b2cattractionOrders.forEach((order) => {
            order.activities.forEach((activity) => {
                b2cattractionTotalPrice += activity.grandTotal;
                b2cattractionTotalCost += activity.totalCost;
                b2cattractionTotalProfit += activity.profit;
            });
            b2cattractionTotalOrders += 1;
        });

        let visaTotalPrice = 0;
        let visaTotalCost = 0;
        let visaTotalProfit = 0;
        let visaTotalOrders = 0;

        const visaOrders = await B2CVisaApplication.find({
            createdAt: {
                $gte: new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate(),
                    0,
                    0,
                    0
                ), // Start of yesterday
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), // Start of today
            },
            status: "payed",
        });
        visaOrders.forEach((order) => {
            visaTotalPrice += order.totalPrice;
            visaTotalCost += order.totalCost;
            visaTotalProfit += order.profit;
            visaTotalOrders += 1;
        });

        let b2bvisaTotalPrice = 0;
        let b2bvisaTotalCost = 0;
        let b2bvisaTotalProfit = 0;
        let b2bvisaTotalOrders = 0;
        const b2bvisaOrders = await B2CVisaApplication.find({
            createdAt: {
                $gte: new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate(),
                    0,
                    0,
                    0
                ), // Start of yesterday
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), // Start of today
            },
            status: "payed",
        });
        b2bvisaOrders.forEach((order) => {
            b2bvisaTotalPrice += order.totalPrice;
            b2bvisaTotalCost += order.totalCost;
            b2bvisaTotalProfit += order.profit;
            b2bvisaTotalOrders += 1;
        });

        let a2aTotalPrice = 0;
        let a2aTotalCost = 0;
        let a2aTotalProfit = 0;
        let a2aTotalOrders = 0;

        const a2aOrders = await B2BA2aOrder.find({
            createdAt: {
                $gte: new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate(),
                    0,
                    0,
                    0
                ), // Start of yesterday
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), // Start of today
            },
            orderStatus: "paid",
        });
        a2aOrders.forEach((order) => {
            order.passengerDetails.forEach((item) => {
                a2aTotalPrice += item.amount;
                a2aTotalCost += Number(item.amount) - Number(item.profit);
                a2aTotalProfit += item.profit;
            });

            a2aTotalOrders += 1;
        });

        let hotelTotalPrice = 0;
        let hotelTotalCost = 0;
        let hotelTotalProfit = 0;
        let hotelTotalOrders = 0;

        const b2bhotelOrders = await B2bHotelOrder.find({
            createdAt: {
                $gte: new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate(),
                    0,
                    0,
                    0
                ), // Start of yesterday
                $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0), // Start of today
            },
            status: { $in: ["confirmed", "booked"] }, // Use $in operator to match against multiple values
        });
        b2bhotelOrders.forEach((order) => {
            hotelTotalPrice += order.netPrice;
            hotelTotalCost += order.roomPrice;
            hotelTotalProfit += item.totalMarkup;
            hotelTotalOrders += 1;
        });

        totalCost =
            attractionTotalCost +
            b2cattractionTotalCost +
            visaTotalCost +
            b2bvisaTotalCost +
            a2aTotalCost +
            hotelTotalCost;
        totalPrice =
            attractionTotalPrice +
            b2cattractionTotalPrice +
            visaTotalPrice +
            b2bvisaTotalPrice +
            a2aTotalPrice +
            hotelTotalPrice;
        totalOrders =
            attractionTotalOrders +
            b2cattractionTotalOrders +
            visaTotalOrders +
            b2bvisaTotalOrders +
            a2aTotalOrders +
            hotelTotalOrders;
        totalProfit =
            attractionTotalProfit +
            b2cattractionTotalProfit +
            visaTotalProfit +
            b2bvisaTotalProfit +
            a2aTotalProfit +
            hotelTotalProfit;

        if (whatsappManagment) {
            await sendMessageHelper({
                type: "message",
                number: `${whatsappManagment?.phoneCode}${whatsappManagment?.phoneNumber}`,
                message: `Total Order Details - ${date} 
                \nB2B Attraction Order Details \nTotalOrders : ${attractionTotalOrders} \nTotalPrice : ${attractionTotalPrice} \nTotalCost : ${attractionTotalCost} \nTotalProfit : ${attractionTotalProfit}
                \nB2C Attraction Order Details \nTotalOrders : ${b2cattractionTotalOrders} \nTotalPrice : ${b2cattractionTotalPrice} \nTotalCost : ${b2cattractionTotalCost} \nTotalProfit : ${b2cattractionTotalProfit}
                \nB2C Visa Order Details  \nTotalOrders : ${visaTotalOrders} \nTotalPrice : ${visaTotalPrice} \nTotalCost : ${visaTotalCost} \nTotalProfit : ${visaTotalProfit}
                \nB2B Visa Order Details \nTotalOrders : ${b2bvisaTotalOrders} \nTotalPrice : ${b2bvisaTotalPrice} \nTotalCost : ${b2bvisaTotalCost} \nTotalProfit : ${b2bvisaTotalProfit}
                \nB2B A2A Order Details \nTotalOrders : ${a2aTotalOrders} \nTotalPrice : ${a2aTotalPrice} \nTotalCost : ${a2aTotalCost} \nTotalProfit : ${a2aTotalProfit}
                \nB2B Hotel Order Details \nTotalOrders : ${hotelTotalOrders} \nTotalPrice : ${hotelTotalPrice} \nTotalCost : ${hotelTotalCost} \nTotalProfit : ${hotelTotalProfit}
                \nComplete Order Details \nTotalOrders : ${totalOrders} \nTotalPrice : ${totalPrice} \nTotalCost : ${totalCost} \nTotalProfit : ${totalProfit}
               `,
            });
        }
    } catch (e) {
        console.log(e);
    }
};

module.exports = { completeProfitDetailWhatsappHelper };

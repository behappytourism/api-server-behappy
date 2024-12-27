const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const NODE_ENV = process.env.NODE_ENV === "production" ? "production" : "development";

require("dotenv").config({
    path: path.join(__dirname, "../" + `.env.${NODE_ENV}`),
});
const adminRouter = require("./admin");
const b2bRouter = require("./b2b");
const {
    homeRouter,
    usersRouter,
    attractionsRouter,
    subscribersRouter,
    attractionReviewsRouter,
    countriesRouter,
    blogsRouter,
    attractionsCategoriesRouter,
    attractionsOrdersRouter,
    visaListRouter,
    visaApplicationRouter,
    searchListRouter,
    visaEnquiryRouter,
    affiliateRouter,
    affiliateRedeemRouter,
    hotelAvailabilitiesRouter,
    hotelsRouter,
    hotelOrdersRouter,
    seoRouter,
    b2cOrderRouter,
    transferRouter,
    attrStandAloneRouter,
    b2cFrontendRouter,
    b2cTransferOrderRouter,
} = require("./routes");
const { default: axios } = require("axios");
const { AttractionTicket } = require("./models");
const { Types } = require("mongoose");
const { B2BAttractionOrder, Reseller } = require("./b2b/models");
const { b2cTourPackagesRouter, b2cTourPackageEnquiryRouter } = require("./routes/tourPackage");

const app = express();

app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(
    express.urlencoded({
        extended: true,
        limit: "50mb",
    })
);
app.use(cors());
app.use(cookieParser());

app.use("/public", express.static("public"));

app.use("/api/v1/home", homeRouter);
app.use("/api/v1/users", usersRouter);

// Attraction routes
app.use("/api/v1/attractions/reviews", attractionReviewsRouter);
app.use("/api/v1/attractions/categories", attractionsCategoriesRouter);
app.use("/api/v1/attractions/orders", attractionsOrdersRouter);
app.use("/api/v1/attractions", attractionsRouter);
app.use("/api/v1/attractions/standalone", attrStandAloneRouter);

app.use("/api/v1/subscribers", subscribersRouter);
app.use("/api/v1/countries", countriesRouter);
app.use("/api/v1/blogs", blogsRouter);
app.use("/api/v1/search", searchListRouter);

// Hotels routes
app.use("/api/v1/hotels", hotelsRouter);
app.use("/api/v1/hotels/availabilities", hotelAvailabilitiesRouter);
app.use("/api/v1/hotels/orders", hotelOrdersRouter);
// app.use("/api/v1/hotels/requests", hotelRequestsRouter);

// Visa routes
app.use("/api/v1/visa", visaListRouter);
app.use("/api/v1/visa/application", visaApplicationRouter);
app.use("/api/v1/visa/enquiry", visaEnquiryRouter);

app.use("/api/v1/affiliate", affiliateRouter);
app.use("/api/v1/affiliate/redeem", affiliateRedeemRouter);
app.use("/api/v1/seo", seoRouter);
app.use("/api/v1/transfer", transferRouter);
app.use("/api/v1/transfer/order", b2cTransferOrderRouter);

// Order routes B2c
app.use("/api/v1/orders", b2cOrderRouter);

// app.use("/api/v1/transfer", transferAvailabilitiesRouter);

app.use("/api/v1/tour-packages/enquiries", b2cTourPackageEnquiryRouter);
app.use("/api/v1/tour-packages", b2cTourPackagesRouter);
app.use("/api/v1/b2c", b2cFrontendRouter);

// ADMIN ROUTE
app.use("/api/v1/admin", adminRouter);

// B2B Route
app.use("/api/v1/b2b", b2bRouter);

// This is a simple proxy for Ottila Hotel API
app.post("/proxy", async (req, res) => {
    try {
        const { url, headers } = req.body;

        if (!url) {
            return res.status(400).json({ message: "Invalid URL" });
        }

        const response = await axios.post(
            url,
            { ...req.body, url: undefined, headers: undefined },
            {
                headers: {
                    ...headers,
                },
            }
        );

        res.status(200).json(response.data);
    } catch (err) {
        res.status(200).json(err);
    }
});
// app.get("/prox", async (req, res) => {
//     try {
//         const resellers = await Reseller.find({})

//         for (const reseller of resellers){
//             const b2bUser = new B2bUser
//         }
//     } catch (err) {}
// });
//

module.exports = { app };

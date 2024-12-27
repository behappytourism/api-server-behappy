const axios = require("axios");
const { isValidObjectId } = require("mongoose");
const { User, AttractionActivity, AttractionOrder } = require("../models");

const MERCHANT_CODE = process.env.TABBY_MERCHANT_CODE;
const PUBLIC_KEY = process.env.TABBY_PUBLIC_KEY;
const SECRET_KEY = process.env.TABBY_SECRET_API_KEY;

const b2cTabbyFormHandler = async ({
    res,
    userId,
    name,
    email,
    country,
    phoneNumber,
    orderId,
    selectedActivities,
    totalAmount,
}) => {
    try {
        const user = await User.findOne({ _id: userId });
        const attractionOrders = await AttractionOrder.find({ email })
            .populate("activities.activity")
            .sort({ createdAt: -1 })
            .skip(1)
            .limit(10);

        const orderCount = await AttractionOrder.find({ email }).count();
        let activities = [];

        for (let i = 0; i < selectedActivities?.length; i++) {
            if (!isValidObjectId(selectedActivities[i]?.activity)) {
                throw Error(`"selectedActivities[${i}].activity", Invalid activity id`);
            }

            const activity = await AttractionActivity.findOne({
                _id: selectedActivities[i]?.activity,
                isDeleted: false,
            });

            if (activity) {
                let item = {
                    title: activity?.name,
                    // image_url: activity?.images[0],
                    quantity:
                        selectedActivities[i].adultsCount + selectedActivities[i].childrenCount,
                    unit_price: (
                        Number(totalAmount) /
                        Number(
                            selectedActivities[i].adultsCount + selectedActivities[i].childrenCount
                        )
                    )
                        .toFixed(2)
                        .toString(),
                    description: activity?.description,
                    category: "attraction",
                    reference_id: activity?._id,
                };

                activities.push(item);
            }
        }

        let checkoutObject = {
            payment: {
                amount: totalAmount,
                currency: "AED",
                description: "test",
                buyer: {
                    phone: phoneNumber,
                    email: email,
                    name: name,
                    dob: "2019-08-24",
                },
                // shipping_address: {
                // city: "kochi",
                // address: user?.address,
                // zip: user?.zipCode?.toString(),
                // },
                order: {
                    tax_amount: "0.00",
                    shipping_amount: "0.00",
                    discount_amount: "0.00",
                    updated_at: new Date(),
                    reference_id: orderId,
                    items: activities,
                },
                buyer_history: {
                    registered_since: user?.createdAt,
                    loyalty_level: orderCount || 0,
                    wishlist_count: 0,
                    is_social_networks_connected: true,
                    is_phone_number_verified: true,
                    is_email_verified: true,
                },
                order_history: attractionOrders.map((order, index) => {
                    return {
                        purchased_at: order.createdAt,
                        amount: order.totalAmount,
                        payment_method: "card",
                        status: index === 1 ? "new" : "new",
                        buyer: {
                            email: order.email,
                            name: order.name,
                            phone: order.phoneNumber,
                            // dob: "2000-08-24",
                        },
                        // shipping_address: {
                        // city: "kochi",
                        // address: resellerDetails?.address,
                        // zip: resellerDetails?.zipCode?.toString(),
                        // },
                        items: order.activities.map((act) => {
                            return {
                                title: act?.activity?.name,
                                // image_url: act?.activity?.images[0],
                                quantity: act.adultsCount + act.adultsCount,
                                unit_price: (
                                    Number(act.grandTotal) /
                                    Number(act.adultsCount + act.adultsCount)
                                )
                                    .toFixed(2)
                                    .toString(),
                                description: act?.activity?.description,
                                category: "attraction",
                                reference_id: act?._id,
                            };
                        }),
                        meta: {
                            order_id: orderId,
                            customer: null,
                        },
                        attachment: {
                            body: {
                                payment_history_simple: {
                                    unique_account_identifier: email,
                                    paid_before_flag: false,
                                    date_of_last_paid_purchase:
                                        attractionOrders.length > 0
                                            ? new Date(attractionOrders[0].createdAt)
                                                  .toISOString()
                                                  .split("T")[0]
                                            : new Date().toISOString().split("T")[0],
                                    date_of_first_paid_purchase:
                                        attractionOrders.length > 0
                                            ? new Date(
                                                  attractionOrders[
                                                      attractionOrders.length - 1
                                                  ].createdAt
                                              )
                                                  ?.toISOString()
                                                  ?.split("T")[0]
                                            : new Date().toISOString().split("T")[0],
                                },
                            },
                            content_type: "application/vnd.tabby.v1+json",
                        },
                    };
                }),
            },
            lang: "en",
            merchant_code: MERCHANT_CODE,
            merchant_urls: {
                success: `${process.env.REACT_APP_URL}/attraction/${orderId}`,
                cancel: `${process.env.REACT_APP_URL}/attraction/failure?paymentProcessor=tabby&status=cancel`,
                failure: `${process.env.REACT_APP_URL}/attraction/failure?paymentProcessor=tabby&status=failure`,
            },
        };

        console.log(checkoutObject, "checkoutObject");

        let response = await axios.post(`https://api.tabby.ai/api/v2/checkout`, checkoutObject, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${PUBLIC_KEY}`,
            },
        });

        console.log(response?.data?.status, "status");

        if (response?.data?.status === "created") {
            const finalRes = await axios.get(
                `https://api.tabby.ai/api/v2/checkout/${response?.data?.id}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        Authorization: `Bearer ${PUBLIC_KEY}`,
                    },
                }
            );

            return {
                webUrl: finalRes?.data?.configuration?.available_products?.installments[0]?.web_url,
                checkoutDetails: checkoutObject,
            };
        } else if (response?.data?.status === "rejected") {
            if (
                response?.data?.configuration?.products?.installments?.rejection_reason ===
                "not_available"
            ) {
                throw new Error(
                    "Sorry, Tabby is unable to approve this purchase. Please use an alternative payment method for your order."
                );
            } else if (
                response?.data?.configuration?.products?.installments?.rejection_reason ===
                "order_amount_too_high"
            ) {
                throw new Error(
                    "This purchase is above your current spending limit with Tabby, try a smaller cart or use another payment method"
                );
            } else if (
                response?.data?.configuration?.products?.installments?.rejection_reason ===
                "order_amount_too_low"
            ) {
                throw new Error(
                    "The purchase amount is below the minimum amount required to use Tabby, try adding more items or use another payment method"
                );
            }
        }
    } catch (err) {
        console.log(err);
        throw err;
        // throw new Error(err);
    }
};

const b2cTabbyRetrieveHandler = async ({ paymentId }) => {
    try {
        let response = await axios.get(`https://api.tabby.ai/api/v1/payments/${paymentId}`, {
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${SECRET_KEY}`,
            },
        });

        console.log(response.data, "b2cTabbyRetrieveHandler");

        return response.data;
    } catch (error) {
        console.log(error, "err retrieving");
        throw new Error(error);
    }
};

const b2cTabbyCaptureHandler = async ({ paymentId, amount }) => {
    try {
        let response = await axios.post(
            `https://api.tabby.ai/api/v1/payments/${paymentId}/captures`,
            { amount },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${SECRET_KEY}`,
                },
            }
        );

        console.log(response.data, "b2cTabbyCaptureHandler");

        return response.data;
    } catch (err) {
        console.log(err, "err captured");

        conosle.log(err);
    }
};

module.exports = { b2cTabbyFormHandler, b2cTabbyCaptureHandler, b2cTabbyRetrieveHandler };

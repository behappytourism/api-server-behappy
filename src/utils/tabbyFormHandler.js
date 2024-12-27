const { Reseller } = require("../b2b/models");
const axios = require("axios");
const { AttractionActivity } = require("../models");
const { isValidObjectId } = require("mongoose");

const MERCHANT_CODE = process.env.TABBY_MERCHANT_CODE;
const PUBLIC_KEY = process.env.TABBY_PUBLIC_KEY;
const tabbyFormHandler = async ({
    res,
    totalAmount,
    resellerId,
    agentReferenceNumber,
    data,
    name,
    email,
    country,
    phoneNumber,
    orderId,
}) => {
    try {
        const resellerDetails = await Reseller.findById({ _id: resellerId });

        let activities = [];

        for (let i = 0; i < data?.selectedActivities?.length; i++) {
            if (!isValidObjectId(data?.selectedActivities[i]?.activity)) {
                throw Error(`"selectedActivities[${i}].activity", Invalid activity id`);
            }

            const activity = await AttractionActivity.findOne({
                _id: data?.selectedActivities[i]?.activity,
                isDeleted: false,
            });

            if (activity) {
                let item = {
                    title: activity?.name,
                    image_url: activity?.images[0],
                    description: activity?.description,
                    category: activity?.activityType,
                    reference_id: activity?._id,
                };

                activities.push(item);
            }
        }

        let checkoutObj = {
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
                shipping_address: {
                    city: "kochi",
                    address: resellerDetails?.address,
                    zip: resellerDetails?.zipCode?.toString(),
                },
                order: {
                    tax_amount: "0.00",
                    shipping_amount: "0.00",
                    discount_amount: "0.00",
                    updated_at: new Date(),
                    reference_id: orderId,
                },
                item: activities,
                buyer_history: {
                    registered_since: resellerDetails?.createdAt,
                    is_social_networks_connected: true,
                    is_phone_number_verified: true,
                    is_email_verified: true,
                },
                OrderHistory: {
                    purchased_at: new Date(),
                    amount: totalAmount,
                    payment_method: "card",
                    status: "new",
                    buyer: {
                        email: email,
                        name: name,
                        phone: phoneNumber,
                        dob: "2019-08-24",
                    },
                    shipping_address: {
                        city: "kochi",
                        address: resellerDetails?.address,
                        zip: resellerDetails?.zipCode?.toString(),
                    },
                    items: activities,
                    meta: {
                        order_id: orderId,
                        customer: null,
                    },
                    attachment: {
                        body: {},
                        content_type: "application/vnd.tabby.v1+json",
                    },
                },
            },
            lang: "en",
            merchant_code: MERCHANT_CODE,
            merchant_urls: {
                success: `${process.env.B2B_WEB_URL}/attractions/invoice/${orderId}`,
                cancel: "https://your-store/cancel",
                failure: `${process.env.B2B_WEB_URL}/payment-decline`,
            },
        };

        let response;
        try {
            response = await axios.post(`https://api.tabby.ai/api/v2/checkout`, checkoutObj, {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${PUBLIC_KEY}`,
                },
            });

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

                res.status(200).json(
                    finalRes?.data?.configuration?.available_products?.installments[0]?.web_url
                );
                res.end();
            }
        } catch (err) {
            console.log(err);
            throw new Error(err);
        }
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = tabbyFormHandler;

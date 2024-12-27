const crypto = require("crypto");
const nodeCCAvenue = require("node-ccavenue");

const { sendErrorResponse } = require("../../../helpers");
const { HomeSettings } = require("../../../models");
const { fetchOrder, fetchPayment } = require("../../../utils/paypal");
const { sendWalletDeposit } = require("../../helpers");
const { B2BTransaction, B2BWallet, B2BWalletDeposit } = require("../../models");
const { b2bAttractionOrderCaptureSchema } = require("../../validations/b2bAttractionOrder.schema");

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

module.exports = {
    walletDeposit: async (req, res) => {
        try {
            const { paymentProcessor, amount } = req.body;

            if (Number(amount) < 10) {
                return sendErrorResponse(res, 500, "minimum amount should be 10 or above");
            }

            // 3% is the transaction fee of ccavenue
            const tfee = (amount / 100) * 3;
            const deposit = await B2BWalletDeposit.create({
                reseller: req.reseller?._id,
                depositAmount: amount,
                creditAmount: amount - tfee,
                fee: tfee,
                status: "pending",
                isDepositedByAdmin: false,
                paymentProcessor,
            });

            if (paymentProcessor === "ccavenue") {
                const orderParams = {
                    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
                    order_id: deposit?._id,
                    currency: "AED",
                    amount: amount,
                    redirect_url: `${process.env.SERVER_URL}/api/v1/wallet/ccavenue/capture`,
                    cancel_url: `${process.env.SERVER_URL}/api/v1/wallet/ccavenue/capture`,
                    language: "EN",
                    // integration_type: "iframe_normal",
                };

                let accessCode = process.env.CCAVENUE_ACCESS_CODE;

                const encRequest = ccav.getEncryptedOrder(orderParams);
                const formbody =
                    '<form id="nonseamless" method="post" name="redirect" action="https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction"/> <input type="hidden" id="encRequest" name="encRequest" value="' +
                    encRequest +
                    '"><input type="hidden" name="access_code" id="access_code" value="' +
                    accessCode +
                    '"><script language="javascript">document.redirect.submit();</script></form>';

                // const formbody =
                //     '<html><head><title>Sub-merchant checkout page</title><script src="http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script></head><body><center><!-- width required mininmum 482px --><iframe  width="482" height="500" scrolling="No" frameborder="0"  id="paymentFrame" src="https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction&merchant_id=' +
                //     orderParams.merchant_id +
                //     "&encRequest=" +
                //     encRequest +
                //     "&access_code=" +
                //     accessCode +
                //     '"></iframe></center><script type="text/javascript">$(document).ready(function(){$("iframe#paymentFrame").load(function() {window.addEventListener("message", function(e) {$("#paymentFrame").css("height",e.data["newHeight"]+"px"); }, false);}); });</script></body></html>';

                res.setHeader("Content-Type", "text/html");
                res.write(formbody);
                res.end();
            } else {
                return sendErrorResponse(res, 400, "invalid payment processor");
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    captureCCAvenueWalletPayment: async (req, res) => {
        try {
            const { encResp } = req.body;

            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;

            let walletDeposit = await B2BWalletDeposit.findOne({
                _id: order_id,
                paymentProcessor: "ccavenue",
                status: "pending",
            });
            if (!walletDeposit) {
                return sendErrorResponse(
                    res,
                    400,
                    "something went wrong. if payment is deducted from your bank, then please contact our team."
                );
            }

            if (order_status !== "Success") {
                walletDeposit.status = "failed";
                await walletDeposit.save();

                res.writeHead(301, {
                    Location: `${process.env.REACT_APP_URL}/b2b/wallet/deposit/${order_id}/cancelled`,
                });
                res.end();
            } else {
                walletDeposit.status = "completed";
                await walletDeposit.save();

                let b2bWallet = await B2BWallet.findOne({ reseller: walletDeposit.reseller });
                if (!b2bWallet) {
                    b2bWallet = new B2BWallet({
                        balance: 0,
                        creditAmount: 0,
                        creditUsed: 0,
                        reseller: req.reseller._id,
                    });

                    b2bWallet.balance += Number(walletDeposit.creditAmount);
                    await b2bWallet.save();
                } else {
                    if (b2bWallet.creditUsed && b2bWallet.creditUsed > 0) {
                        let balance =
                            Number(b2bWallet.creditUsed) - Number(walletDeposit.creditAmount);

                        if (balance <= 0) {
                            b2bWallet.creditUsed = 0;
                            b2bWallet.balance += Number(-balance);
                            await b2bWallet.save();
                        } else {
                            b2bWallet.creditUsed = Number(balance);
                            await b2bWallet.save();
                        }
                    } else {
                        b2bWallet.balance += Number(walletDeposit.creditAmount);
                        await b2bWallet.save();
                    }
                }

                await B2BTransaction.create({
                    reseller: walletDeposit.reseller,
                    paymentProcessor: "wallet",
                    product: "wallet",
                    processId: walletDeposit?._id,
                    description: `An amount of ${amount} AED deposited through ccavenue`,
                    debitAmount: 0,
                    creditAmount: amount,
                    directAmount: 0,
                    closingBalance: b2bWallet.balance,
                    dueAmount: b2bWallet.creditUsed,
                    remark: "Wallet Deposit",
                    dateTime: new Date(),
                });

                let reseller = walletDeposit.reseller;
                sendWalletDeposit(reseller, walletDeposit);

                res.writeHead(301, {
                    Location: `${process.env.REACT_APP_URL}/b2b/wallet/deposit/${order_id}/success`,
                });
                res.end();
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllDepositsList: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const deposits = await B2BWalletDeposit.find({ reseller: req.reseller?._id })
                .select(
                    "depositAmount creditAmount fee status paymentProcessor note b2bWalletDepositRefNumber createdAt"
                )
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalDeposits = await B2BWalletDeposit.find({
                reseller: req.reseller?._id,
            }).count();

            res.status(200).json({
                totalDeposits,
                skip: Number(skip),
                limit: Number(limit),
                deposits,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    // TODO:
    // update required for paypal and razorpay payments
    capturePaypalWalletDeposit: async (req, res) => {
        try {
            const { orderId, paymentId } = req.body;

            const { _, error } = b2bAttractionOrderCaptureSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const transaction = await B2BTransaction.findOne({
                paymentOrderId: orderId,
            });

            if (!transaction) {
                return sendErrorResponse(
                    res,
                    400,
                    "transation not found!. check with the team if amount is debited from your bank!"
                );
            }

            if (transaction.status === "success") {
                return sendErrorResponse(res, 400, "this transaction already completed, Thank you");
            }

            const orderObject = await fetchOrder(orderId);

            if (orderObject.statusCode == "500") {
                transaction.status = "failed";
                await transaction.save();

                return sendErrorResponse(
                    res,
                    400,
                    "Error while fetching order status from paypal. Check with XYZ team if amount is debited from your bank!"
                );
            } else if (orderObject.status !== "COMPLETED") {
                transaction.status = "failed";
                await transaction.save();

                return sendErrorResponse(
                    res,
                    400,
                    "Paypal order status is not Completed. Check with XYZ team if amount is debited from your bank!"
                );
            } else {
                const paymentObject = await fetchPayment(paymentId);

                if (paymentObject.statusCode == "500") {
                    transaction.status = "failed";
                    await transaction.save();

                    return sendErrorResponse(
                        res,
                        400,
                        "Error while fetching payment status from paypal. Check with XYZ team if amount is debited from your bank!"
                    );
                } else if (paymentObject.result.status !== "COMPLETED") {
                    transaction.status = "failed";
                    await transaction.save();

                    return sendErrorResponse(
                        res,
                        400,
                        "Paypal payment status is not Completed. Please complete your payment!"
                    );
                } else {
                    transaction.status = "success";
                    transaction.paymentDetails = paymentObject?.result;
                    await transaction.save();

                    // do conversion

                    let b2bWallet = await B2BWallet.findOne({ reseller: req.reseller._id });
                    if (!b2bWallet) {
                        b2bWallet = new B2BWallet({
                            balance: 0,
                            creditAmount: 0,
                            creditUsed: 0,
                            reseller: req.reseller._id,
                        });

                        b2bWallet.balance += Number(amount);
                        await b2bWallet.save();
                    } else {
                        if (b2bWallet.creditUsed && b2bWallet.creditUsed > 0) {
                            let balance = Number(b2bWallet.creditUsed) - Number(amount);

                            console.log(balance, "balance");
                            if (balance <= 0) {
                                b2bWallet.creditUsed = 0;
                                b2bWallet.balance += Number(-balance);
                                await b2bWallet.save();
                            } else {
                                b2bWallet.creditUsed = Number(balance);
                                await b2bWallet.save();
                            }
                        } else {
                            b2bWallet.balance += Number(amount);
                            await b2bWallet.save();
                        }
                    }
                }
            }

            let reseller = req.reseller;
            const companyDetails = await HomeSettings.findOne();
            // sendWalletDeposit(reseller, transaction, companyDetails);

            res.status(200).json({ message: "Transaction Successful" });
        } catch (err) {
            // handle transaction fail here
            sendErrorResponse(res, 500, err);
        }
    },

    // TODO:
    // update required for paypal and razorpay payments
    captureRazorpayAttractionPayment: async (req, res) => {
        try {
            const { razorpay_order_id, transactionid, razorpay_signature, orderId } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            let transaction = await B2BTransaction.findOne({
                paymentProcessor: "razorpay",
                orderId: orderId,
                status: "pending",
            });

            if (!transaction) {
                return sendErrorResponse(
                    res,
                    400,
                    "Attraction order not found!. Please create an order first. Check with our team if amount is debited from your bank!"
                );
            }

            if (transaction.status === "success") {
                return sendErrorResponse(
                    res,
                    400,
                    "This order already completed, Thank you. Check with our team if you paid multiple times."
                );
            }

            const generated_signature = crypto.createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            );
            generated_signature.update(razorpay_order_id + "|" + transactionid);

            if (generated_signature.digest("hex") !== razorpay_signature) {
                transaction.status = "failed";
                await transaction.save();

                return sendErrorResponse(res, 400, "Transaction failed");
            }

            transaction.status = "success";
            await transaction.save();

            return res.status(200).json({
                message: "Transaction Successful",
            });
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },
};

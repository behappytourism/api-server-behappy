const { compare, hash } = require("bcryptjs");

const { sendErrorResponse, sendMobileOtp } = require("../../helpers");
const { User, Country, Subscriber, FinancialUserData, AffiliateUser } = require("../../models");
const {
    userLoginSchema,
    userEmailLoginSchema,
    userSignupSchema,
    userUpdateSchema,
    userPasswordUpdateSchema,
    userForgetPasswordSchema,
    deleteUserSchema,
} = require("../../validations/user.schema");
const { isValidObjectId } = require("mongoose");
const userSignUpEmail = require("../../helpers/SignupEmail");
const sendForgetPasswordOtp = require("../../b2b/helpers/sendForgetPasswordMail");
const { userFinancialDataSchema } = require("../../validations/user/userFinancial.schema");

module.exports = {
    doSignup: async (req, res) => {
        try {
            const { name, email, password, country, phoneNumber } = req.body;

            const { _, error } = userSignupSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const user = await User.findOne({ email, isDeleted: false });
            if (user) {
                return sendErrorResponse(res, 400, "Email already exists");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "Country not found");
            }

            const countryDetails = await Country.findOne({ isDeleted: false });
            if (!countryDetails) {
                return sendErrorResponse(res, 404, "Country not found");
            }

            const hashedPassowrd = await hash(password, 8);

            const newUser = new User({
                name,
                email,
                password: hashedPassowrd,
                country,
                phoneNumber,
            });

            const jwtToken = await newUser.generateAuthToken();
            newUser.jwtToken = jwtToken;
            await newUser.save();

            userSignUpEmail(
                email,
                "User SignUp Mail",
                " You have been successfully registered new account ."
            );

            res.status(200).json({ newUser, jwtToken });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    emailSignup: async (req, res) => {
        try {
            const { email, name } = req.body;
            const { _, error } = userEmailLoginSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }
            if (!email) {
                return sendErrorResponse(res, 400, "email is Required");
            }

            const findUser = await User.findOne({ email: email, isDeleted: false });
            if (findUser) {
                // const user = new User({
                //     email: email,
                //     name: name,
                //     isDeleted: false,
                // });
                const jwtToken = await findUser.generateAuthToken();
                findUser.save();
                res.status(200).json({ findUser, jwtToken, message: "login success" });
            } else {
                const newUser = new User({
                    name,
                    email,
                });

                const jwtToken = await newUser.generateAuthToken();
                newUser.jwtToken = jwtToken;
                await newUser.save();

                userSignUpEmail(
                    email,
                    "User SignUp Mail",
                    " You have been successfully registered new account ."
                );

                res.status(200).json({ newUser, jwtToken, message: "created success" });
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    iosSignup: async (req, res) => {
        try {
            const { email, name, iosToken } = req.body;

            const findUser = await User.findOne({ iosToken: iosToken, isDeleted: false });
            if (findUser) {
                const subscriber = await Subscriber.findOne({ email }, { subscribed: true });
                let isSubscribed = subscriber ? true : false;

                const jwtToken = await findUser.generateAuthToken();
                findUser.save();

                res.status(200).json({ user: findUser, isSubscribed, jwtToken });
            } else {
                if (!email) {
                    return sendErrorResponse(res, 400, "please provide email exists");
                }

                const user = new User({
                    name,
                    email,
                    iosToken,
                });

                const subscriber = await Subscriber.findOne({ email }, { subscribed: true });
                let isSubscribed = subscriber ? true : false;

                const jwtToken = await user.generateAuthToken();
                user.jwtToken = jwtToken;
                await user.save();

                userSignUpEmail(
                    email,
                    "User SignUp Mail",
                    " You have been successfully registered new account ."
                );

                res.status(200).json({ user, isSubscribed, jwtToken });
            }
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    doLogin: async (req, res) => {
        try {
            const { email, password } = req.body;

            const { _, error } = userLoginSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const user = await User.findOne({ email, isDeleted: false });
            if (!user) {
                return sendErrorResponse(res, 400, "Invalid Email");
            }

            const isMatch = await compare(password, user.password);
            if (!isMatch) {
                return sendErrorResponse(res, 400, "Invalid Password");
            }

            const subscriber = await Subscriber.findOne({ email }, { subscribed: true });
            let isSubscribed = subscriber ? true : false;

            const jwtToken = await user.generateAuthToken();
            await user.save();

            res.status(200).json({ user, isSubscribed, jwtToken });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAccount: async (req, res) => {
        try {
            const affiliate = await AffiliateUser.findOne({
                user: req.user._id,
                isActive: true,
                isDeleted: false,
            });

            const { _id, name, email, isEmailVerified, country, balance, avatar, phoneNumber } =
                req.user;
            res.status(200).json({
                _id,
                name,
                email,
                isEmailVerified,
                country,
                balance,
                avatar,
                phoneNumber,
                isAffiliate: affiliate ? true : false,
                affiliateCode: affiliate ? affiliate.affiliateCode : "",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateUser: async (req, res) => {
        try {
            const { name, email, phoneNumber, country } = req.body;

            const { _, error } = userUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let avatarImg;
            if (req.file?.path) {
                avatarImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (country) {
                const countryDetails = await Country.findOne({
                    _id: country,
                    isDeleted: false,
                });
                if (!countryDetails) {
                    return sendErrorResponse(res, 404, "Country details not found");
                }
            }

            const user = await User.findOneAndUpdate(
                { _id: req.user._id },
                { name, email, country, phoneNumber, avatar: avatarImg },
                { runValidators: true, new: true }
            );
            if (!user) {
                return sendErrorResponse(res, 404, "User not found");
            }

            res.status(200).json(user);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updatePassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;

            const { _, error } = userPasswordUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const isMatch = await compare(oldPassword, req.user.password);
            if (!isMatch) {
                return sendErrorResponse(res, 400, "Old password is incorrect");
            }

            const hashedPassowrd = await hash(newPassword, 8);
            const user = await User.findOneAndUpdate(
                { _id: req.user._id },
                { password: hashedPassowrd }
            );

            if (!user) {
                return sendErrorResponse(res, 404, "User not found");
            }

            res.status(200).json({ message: "Password updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    forgetPassword: async (req, res) => {
        try {
            const { email } = req.body;

            let user = await User.findOne({ email: email?.toLowerCase(), isDeleted: false });
            if (!user) {
                return sendErrorResponse(res, 400, "User Not Found");
            }

            const otp = 12345;

            user.otp = otp;
            await user.save();

            await sendForgetPasswordOtp(email, otp);

            res.status(200).json({
                message: "Verification OTP Send To Your Email",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeForgetPassword: async (req, res) => {
        try {
            const { email, otp, newPassword } = req.body;

            const { _, error } = userForgetPasswordSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const user = await User.findOne({ email: email?.toLowerCase() });
            if (!user) {
                return sendErrorResponse(res, 400, "Account not found");
            }

            if (Number(user.otp) != Number(otp)) {
                return sendErrorResponse(res, 400, "OTP Is Wrong");
            }

            const hashedPassowrd = await hash(newPassword, 8);

            user.password = hashedPassowrd;
            await user.save();

            res.status(200).json({ message: "Password Updated Sucessfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAccount: async (req, res) => {
        try {
            let user = await User.findOne({ _id: req.user?._id, isDeleted: false });
            if (!user) {
                return sendErrorResponse(res, 400, "User Not Found");
            }

            user.isDeleted = true;
            await user.save();

            res.status(200).json({ message: "Account Deleted Sucessfully" });
        } catch (error) {
            sendErrorResponse(res, 500, err);
        }
    },
};

const { hash, compare } = require('bcryptjs')
const { isValidObjectId } = require('mongoose')
const { sendErrorResponse } = require('../../../helpers')
const { Reseller, ResellerConfiguration } = require('../../models')
const {
    resellerLoginSchema
} = require('../../validations/b2bReseller.schema')

const { createNewAccessToken, generateAccessToken, generateRefreshToken } = require('../../../config/jwtConfig')

module.exports = {

    resellerApiLogin: async(req, res) => {
        try{
          
            const {agentCode, email, password} = req.body
            const {_, error} = resellerLoginSchema.validate(req.body)
            if(error){
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                )
            }

            const reseller = await Reseller.findOne({email}).populate('country');
            if(!reseller) {
                return sendErrorResponse(res, 400, "invalid credentials")
            }
            if(reseller.agentCode !== Number(agentCode)) {
                return sendErrorResponse(res, 400, "invalid credentials")
            }
            const isMatch = await compare(password, reseller.password)
            if(!isMatch){
                return sendErrorResponse(res, 400, "invalid password credentials")
            }
            if(reseller.status !== "ok"){
                return sendErrorResponse(
                    res,
                    400,
                    "Your account is currently disabled or under verification. Please contact support team if you have any queries"
                )
            }

            // const jwtToken = await reseller.generateAuthToken()
            const accessToken = await generateAccessToken(reseller._id)
            await reseller.save()
            const refreshToken = await generateRefreshToken(reseller?._id)

            res.cookie("refreshToken", refreshToken, {
                httpOnly: false,
                sameSite:"none",
                secure:true
            })

            // const configuration = await ResellerConfiguration.findOne({
            //     reseller:reseller._id,
            // }).lean()

            const tempObj = JSON.parse(JSON.stringify(reseller));
            // tempObj.configuration = configuration

            let data = {
                email: tempObj.email,
                name:tempObj.name,
                companyName:tempObj.companyName,
                agentCode:tempObj.agentCode 
            }

            res.status(200).json({reseller:data, accessToken})

        }catch(err){
            sendErrorResponse(res, 500, err);
        }
    },

    getNewAccessToken: async(req, res)=>{
        try{
            const refreshToken = req.cookies?.refreshToken
            const newAccessToken = await createNewAccessToken(refreshToken)
            res.status(200).json({accessToken: newAccessToken})
        }catch(err){
            sendErrorResponse(res, 500, err)
        }
    }

}
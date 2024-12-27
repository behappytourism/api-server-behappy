const { sign, verify } = require('jsonwebtoken')
const { Reseller } = require('../b2b/models');


module.exports = {

      generateAccessToken : async (_id)=> {
        try{
            return await sign({_id}, process.env.JWT_SECRET, {expiresIn:"40m"})
        }catch(err){
            throw err
        }
    },

     generateRefreshToken: async(_id) => {
        try{
            return await sign({_id}, process.env.JWT_SECRET, {expiresIn:"7d"})
        }catch(err){
            throw err
        }
    },


    // create new access token using refresh token 
     createNewAccessToken: async (token)=> {
        if(!token) return "Refresh token not found"
        try{
            const decode = await verify(token, process.env.JWT_SECRET)
            const user = await Reseller.findOne({_id:decode._id})
            if(!user) return "Unauthorized"
            console.log(user)
            const _id = user?._id.toString()
            const newToken =  await sign({_id}, process.env.JWT_SECRET, {expiresIn:"40m"})
            return newToken
        }catch(err){
            throw err
        }
    }
}
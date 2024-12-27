const { sendErrorResponse } = require('../../../helpers')
const { b2bGetInTouch } = require('../../../b2b/models')

module.exports = {
    getUsersMessages: async(req, res)=> {
        try{
            const { skip, limit } = req.query
            const response = await b2bGetInTouch.find().sort({ createdAt : -1 }).limit(limit).skip(limit * skip).lean()
            const count = await b2bGetInTouch.find().count()
            res.status(200).json({totalCount: count, enquires: response})
        } catch (err) {
            sendErrorResponse(res, 500, err)
        }
    }
}
const {
    AttractionStandAlone,
    Attraction
} = require("../../../models")
const { sendErrorResponse } = require("../../../helpers")
const { isValidObjectId } = require("mongoose")
const { attractionsStandAloneSchema, attractionsStandAloneUpdateSchema } = require("../../validations/attrStandAlone.Schema")



module.exports = {
    createNewAttractionStandAlone: async(req, res)=>{
        try{

            const {
                title,
                description,
                attractions
            } = req.body

            
            let attraction = JSON.parse(attractions)
            
            const { _, error } = attractionsStandAloneSchema.validate({
                ...req.body,
                attractions: attraction
            })

            if(error) return sendErrorResponse(res, 400, error.details[0].message)
            
            if(attraction.length){
                for(let i = 0; i < attraction?.length; i++){
                    let attractionId = attraction[i]
                    if(!isValidObjectId(attractionId)) {
                        return sendErrorResponse(res, 400, `invalid attraction id ${attractionId}`)
                    }
                }
            }

            let images = [];
            let image = req.files["images"];
            if(!image || image?.length < 1) {
                return sendErrorResponse(res, 400, "minimum 1 image is required")
            } else {
                for(let i = 0; i < image?.length; i++){
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    images.push(img)
                }
            }

            const newAttractionStandAlone = new AttractionStandAlone({
                title,
                description,
                attraction,
                images
            })

            await newAttractionStandAlone.save()

            res.status(200).json(newAttractionStandAlone)

        }catch(err){
            console.log(err)
            sendErrorResponse(res, 500, err)
        }
    },

    getAllAttractionStandAloneDetails: async (req, res) => {
        try{

            const { skip = 0, limit = 10, search} = req.query

            const filters = {
                isDeleted: false,
                isActive: true
            }

            if(search && search !== "") {
                filters.title = { $regex: search, $options: "i" };
            }

            const attractionStandAlone = await AttractionStandAlone.find({
                ...filters,
                attraction: {
                    $in: await Attraction.find().distinct("_id")
                }
            })
            .populate({
                path: "attraction",
                model: "Attraction",
                select: "_id title images slug"
            }).limit(limit).skip( limit * skip )

            const totalStandAlone = await AttractionStandAlone.find({isDeleted: false, isActive: true}).count()

            res.status(200).json({
                attractionStandAlone,
                totalStandAlone,
                limit: Number(limit),
                skip: Number(skip)
            })

        }catch (err){
            console.log(err)
            sendErrorResponse(res, 500, err)
        }
    },

    deleteAttractionStandAlone: async (req, res)=>{
        try{

            const { id } = req.params

            const response = await AttractionStandAlone.findByIdAndUpdate(id, {
                
                isActive: false,
                isDeleted: true,
            })

            res.status(200).json({message: "deleted succefully"})

        }catch(err){
            console.log(err)
            sendErrorResponse(res, 500, err)
        }
    },

    getAttractionStandAloneSingle: async (req, res) => {
        try{
            const { id } = req.params

            const response = await AttractionStandAlone.findById({
                _id: id,
                attraction: {
                    $in: await Attraction.find().distinct("_id")
                }
            })
            .populate({
                path: "attraction",
                model: "Attraction",
                select: "_id title images"
            })

            res.status(200).json(response)
        }catch(err){
            console.log(err)
            sendErrorResponse(res, 500, err)
        }
    },

    admUpdateStandAloneUpdate: async (req, res)=>{
        try{

            const { id } = req.params

            const {
                title,
                description,
                attractions,
                initialImg
            } = req.body


            const exist = AttractionStandAlone.findById(id)
            
            if(!exist) return sendErrorResponse(res, 400, "This attraction StandAlone not found")

            
            let attraction = JSON.parse(attractions)

            const { _, error } = attractionsStandAloneUpdateSchema.validate({
                ...req.body,
                attractions: attraction
            })

            if(error) return sendErrorResponse(res, 400, error.details[0].message)
            
            if(attraction.length){
                for(let i = 0; i < attraction?.length; i++){
                    let attractionId = attraction[i]
                    if(!isValidObjectId(attractionId)) {
                        return sendErrorResponse(res, 400, `invalid attraction id ${attractionId}`)
                    }
                }
            }

            let parsedOldImage = [];

            if(initialImg){
                parsedOldImage = JSON.parse(initialImg)
            }

            let images = [...parsedOldImage];
            let image = req.files["images"];
            if(image ) {
                for(let i = 0; i < image?.length; i++){
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    images.push(img)
                }
            } 

            const response = await AttractionStandAlone.findOneAndUpdate(
                { _id: id, isDeleted: false},
                {
                    title,
                    description, 
                    attraction,
                    images
                }
            )

            res.status(200).json({message: "updated successfully", data: response})

        }catch(err){
            console.log(err)
            sendErrorResponse(res, 500, err)
        }
    }

    


}
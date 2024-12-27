const router = require('express').Router()
const multer = require("multer")
const path = require('path')
const {

    createNewAttractionStandAlone,
    getAllAttractionStandAloneDetails,
    deleteAttractionStandAlone,
    getAttractionStandAloneSingle,
    admUpdateStandAloneUpdate

} = require("../../controllers/attraction/attractionStandAloneController")


const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, "public/images/AttractionStandAlone")
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + "." + file.originalname.split(".")[1])
    }

})

const upload = multer({
    limits: {
        fileSize: 20000000,
    },
    fileFilter: (req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload jpg, jpeg, webp, or png"));
        }
        cb(undefined, true);
    },

    storage: storage
}).fields([
    { name: "images", maxCount: 8 }
])


router.post("/create", upload, createNewAttractionStandAlone)
router.get('/all',getAllAttractionStandAloneDetails)
router.patch("/delete/:id", deleteAttractionStandAlone)
router.get("/single-details/:id", getAttractionStandAloneSingle)
router.patch("/update/:id",upload, admUpdateStandAloneUpdate)



module.exports = router;
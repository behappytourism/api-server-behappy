const { sendErrorResponse } = require("../../helpers");
const SeoSetting = require("../../models/seo/seoSetting.model");

module.exports = {
    seoSearch: async (req, res) => {
        try {
            const { type, name, slug } = req.query;
            let title;
            let description;
            let keywords;
            console.log(type, name, slug);
            if (type === "products") {
                const seoSetting = await SeoSetting.findOne(
                    {
                        seoType: type,
                        "seoCategory.name": name,
                    },
                    { "seoCategory.$": 1 }
                );

                if (!seoSetting) {
                    return sendErrorResponse(res, 400, "Category not found");
                }

                const seoCategory = seoSetting?.seoCategory[0]; // Assuming there is only one matching category
                const seoSubCategory = seoCategory?.seoSubCategory?.find((subCat) => {
                    return subCat?.slug.toString() === slug.toString();
                });
                title = seoSubCategory?.title;
                description = seoSubCategory?.description;
                keywords = seoSubCategory?.keywords;
            } else {
                const seoSetting = await SeoSetting.findOne(
                    {
                        seoType: type,
                        "seoCategory.name": name,
                    },
                    { "seoCategory.$": 1 }
                );

                if (!seoSetting) {
                    return sendErrorResponse(res, 400, "Category not found");
                }

                const seoCategory = seoSetting?.seoCategory[0]; // Assuming there is only one matching category
                title = seoCategory?.title;
                description = seoCategory?.description;
                keywords = seoCategory?.keywords;
            }
            res.status(200).json({
                title,
                description,
                keywords,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};

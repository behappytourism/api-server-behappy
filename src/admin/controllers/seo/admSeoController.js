const { Reseller } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const {
    Season,
    Attraction,
    Destination,
    VisaNationality,
    AttractionStandAlone,
    BlogCategory,
    Blog,
} = require("../../../models");
const { isValidObjectId } = require("mongoose");
const SeoSetting = require("../../../models/seo/seoSetting.model");
const { TourPackage } = require("../../../models/tourPackage");

module.exports = {
    addSeoMain: async (req, res) => {
        try {
            const { type, name } = req.body;
            const newSeason = new SeoSetting({
                seoType: type,
                name,
            });

            await newSeason.save();

            res.status(200).json({
                message: "New Seo successfully created",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addCategory: async (req, res) => {
        try {
            const { type, name, slug, metaData } = req.body;

            const existingSeason = await SeoSetting.findOne({ seoType: type });

            if (existingSeason) {
                const nameExists = existingSeason.seoCategory.some(
                    (category) => category.name === name
                );

                if (!nameExists) {
                    existingSeason.seoCategory.push({
                        name,
                        slug: name,
                        metaData,
                    });

                    await existingSeason.save();
                } else {
                    return sendErrorResponse(res, 400, "it already exist");
                }
            } else {
                return sendErrorResponse(res, 400, "type not found");
            }
            res.status(200).json({
                message: "New category successfully created",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateCategory: async (req, res) => {
        try {
            const { type, name, title, description, keywords } = req.body;

            const existingSeason = await SeoSetting.findOne({ seoType: type });

            if (existingSeason) {
                const nameExists = existingSeason.seoCategory.findIndex(
                    (category) => category?.name === name
                );

                if (nameExists !== -1) {
                    existingSeason.seoCategory[nameExists] = {
                        name,
                        slug: name,
                        title: title,
                        description: description,
                        keywords: keywords,
                    };

                    await existingSeason.save();
                } else {
                    return sendErrorResponse(res, 400, "it already exist");
                }
            } else {
                return sendErrorResponse(res, 400, "type not found");
            }
            res.status(200).json(
                existingSeason.seoCategory.find((category) => category?.name === name)
            );
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addSubCategory: async (req, res) => {
        try {
            const { type, name, subName, slug, title, description, keywords } = req.body;
            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            let parsedKeywords;
            if (keywords) {
                parsedKeywords = JSON.parse(keywords);
            }

            console.log(type);

            const existingSeason = await SeoSetting.findOne({ seoType: type });

            if (existingSeason) {
                const nameExists = existingSeason.seoCategory.findIndex(
                    (category) => category.name === name
                );

                if (nameExists !== -1) {
                    const nameSubExists = existingSeason.seoCategory[
                        nameExists
                    ]?.seoSubCategory?.find(
                        (subcategory) => subcategory?.slug?.toString() === slug?.toString()
                    );

                    if (nameSubExists) {
                        // Subcategory with the same slug already exists
                        return sendErrorResponse(
                            res,
                            400,
                            "Subcategory with the same slug already exists"
                        );
                    }

                    if (!nameSubExists) {
                        existingSeason.seoCategory[nameExists].seoSubCategory.push({
                            name: subName,
                            slug: slug,
                            title: title,
                            description: description,
                            keywords: parsedKeywords,
                            image: image,
                        });
                        await existingSeason.save();
                    }
                } else {
                    return sendErrorResponse(res, 400, "it already exist");
                }
            } else {
                return sendErrorResponse(res, 400, "type not found");
            }
            res.status(200).json({
                message: "New category successfully created",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateSubCategory: async (req, res) => {
        try {
            const { type, name, subName, slug, title, description, keywords } = req.body;
            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            let parsedKeywords;
            if (keywords) {
                parsedKeywords = JSON.parse(keywords);
            }

            const existingSeason = await SeoSetting.findOne({ seoType: type });

            if (existingSeason) {
                const nameExists = existingSeason.seoCategory.findIndex(
                    (category) => category.name === name
                );

                if (nameExists !== -1) {
                    const nameSubExists = existingSeason.seoCategory[
                        nameExists
                    ]?.seoSubCategory?.findIndex((category) => category?.slug === slug);

                    if (nameSubExists !== -1) {
                        existingSeason.seoCategory[nameExists].seoSubCategory[nameSubExists] = {
                            name: subName,
                            slug: slug,
                            title: title,
                            description: description,
                            keywords: parsedKeywords,
                            image,
                        };
                        await existingSeason.save();
                    }
                } else {
                    return sendErrorResponse(res, 400, "it already exist");
                }
            } else {
                return sendErrorResponse(res, 400, "type not found");
            }
            res.status(200).json({
                message: "New category successfully created",
            });
        } catch (err) {
            console.log(err);

            sendErrorResponse(res, 500, err);
        }
    },

    getMainCategories: async (req, res) => {
        try {
            const mainCategories = await SeoSetting.find({}).select("seoType name");
            res.status(200).json(mainCategories || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getCategories: async (req, res) => {
        try {
            const { id } = req.params;
            const categories = await SeoSetting.findOne({ seoType: id });
            if (!categories) {
                return sendErrorResponse(res, 400, "category not found");
            }

            res.status(200).json(categories?.seoCategory || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSubCategories: async (req, res) => {
        try {
            const { id, categoryId } = req.params;
            const seoSetting = await SeoSetting.findOne(
                {
                    seoType: seoType,
                    "seoCategory.slug": categoryId,
                },
                { "seoCategory.$": 1 }
            );

            if (!seoSetting) {
                return sendErrorResponse(res, 400, "Category not found");
            }

            const seoCategory = seoSetting.seoCategory[0]; // Assuming there is only one matching category
            const seoSubCategory = seoCategory.seoSubCategory;

            res.status(200).json(seoSubCategory || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSubCategoryProducts: async (req, res) => {
        try {
            const { id, categoryId, subCategoryId } = req.params;

            const { skip = 0, limit = 10, search } = req.query;

            const filter = {};

            if (search && search !== "") {
                filter.slug = { $regex: search, $options: "i" };
            }
            const seoSetting = await SeoSetting.findOne(
                {
                    seoType: id,
                    "seoCategory.slug": categoryId,
                },
                { "seoCategory.$": 1 }
            );

            if (!seoSetting) {
                return sendErrorResponse(res, 400, "Category not found");
            }

            const seoCategory = seoSetting.seoCategory[0]; // Assuming there is only one matching category

            let filteredItems = seoCategory?.seoSubCategory?.filter(
                (category) =>
                    category?.name?.toString() === subCategoryId.toString() &&
                    new RegExp(search).test(category.slug?.toString())
            );
            const startIndex = Number(skip) * Number(limit);
            const endIndex = Number(startIndex) + Number(limit);
            const seoSubCategory = filteredItems.slice(startIndex, endIndex);

            res.status(200).json({
                seoSubCategory: seoSubCategory || [],
                totalSeoSubCategory: filteredItems?.length,
                skip,
                limit,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSeoAttractions: async (req, res) => {
        try {
            const attractions = await Attraction.find({}).select("title slug");

            res.status(200).json(attractions || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSeoDestination: async (req, res) => {
        try {
            const destinations = await Destination.find({ isDeleted: false }).select("slug");
            const datas = destinations.map((destination) => ({ slug: destination?.slug }));
            res.status(200).json(datas || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSeoVisaNatinality: async (req, res) => {
        try {
            const visaNationalities = await VisaNationality.find({ isDeleted: false }).select(
                "slug"
            );

            res.status(200).json(visaNationalities || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSeoTours: async (req, res) => {
        try {
            const tourPackages = await TourPackage.find({ isDeleted: false }).select("slug");

            res.status(200).json(tourPackages || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getStandAlone: async (req, res) => {
        try {
            const standAlones = await AttractionStandAlone.find({ isDeleted: false }).select(
                "slug"
            );

            res.status(200).json(standAlones || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getBlogCategory: async (req, res) => {
        try {
            const blogs = await BlogCategory.find({ isDeleted: false }).select("slug");

            res.status(200).json(blogs || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getBlogList: async (req, res) => {
        try {
            const blogs = await Blog.find({ isDeleted: false }).select("slug");

            res.status(200).json(blogs || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    addMetaData: async (req, res) => {
        try {
        } catch (err) {}
    },

    updateImageAttraction: async (req, res) => {
        try {
            const { type = "products", name = "attraction" } = req.body;

            const existingSeason = await SeoSetting.findOne({ seoType: type });

            if (existingSeason) {
                const nameExists = existingSeasons.seoCategory.findIndex(
                    (category) => category.name === name
                );

                for (const [index, category] of existingSeason.seoCategory[
                    nameExists
                ].seoSubCategory.entries()) {
                    if (category.name === "attraction-products") {
                        const attraction = await Attraction.findOne({ slug: category.slug });

                        existingSeason.seoCategory[nameExists].seoSubCategory[index].image =
                            attraction?.images[0];
                    }
                }

                await existingSeason.save();
            } else {
                return sendErrorResponse(res, 400, "type not found");
            }
            res.status(200).json({
                message: "New image added  successfully created",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};

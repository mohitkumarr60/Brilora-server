"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLayoutByType = exports.editLayout = exports.createLayout = void 0;
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const layout_model_1 = __importDefault(require("../models/layout.model"));
const cloudinary_1 = __importDefault(require("cloudinary"));
//create Layout
// Helper function to create a banner layout
async function createBannerLayout(data) {
    const { image, title, subTitle, text } = data;
    const myCloud = await cloudinary_1.default.v2.uploader.upload(image, { folder: "layout" });
    return {
        type: "Banner",
        banner: {
            image: {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            },
            title,
            subTitle,
            text,
        },
    };
}
// Updated createLayout function
exports.createLayout = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    const { type } = req.body;
    const isTypeExist = await layout_model_1.default.findOne({ type });
    if (isTypeExist) {
        return next(new ErrorHandler_1.default(`${type} already exists`, 400));
    }
    let layoutData;
    switch (type) {
        case "Banner":
            layoutData = await createBannerLayout(req.body);
            break;
        case "Featuring":
            layoutData = { type: "Featuring", featuring: req.body.featuring };
            break;
        case "Categories":
            layoutData = { type: "Categories", categories: req.body.categories };
            break;
        default:
            return next(new ErrorHandler_1.default("Invalid layout type", 400));
    }
    const createdLayout = await layout_model_1.default.create(layoutData);
    res.status(200).json({
        success: true,
        message: "Layout created successfully",
        layout: createdLayout
    });
});
//edit layout
exports.editLayout = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.body;
        if (type === "Banner") {
            const bannerData = await layout_model_1.default.findOne({ type: "Banner" });
            const { image, title, subTitle, text } = req.body;
            const data = image.startsWith("https")
                ? bannerData
                : await cloudinary_1.default.v2.uploader.upload(image, {
                    folder: "layout",
                });
            const banner = {
                type: "Banner",
                image: {
                    public_id: image.startsWith("https")
                        ? bannerData.banner.image.public_id
                        : data?.public_id,
                    url: image.startsWith("https")
                        ? bannerData.banner.image.url
                        : data?.secure_url,
                },
                title,
                subTitle,
                text,
            };
            await layout_model_1.default.findByIdAndUpdate(bannerData._id, { banner });
        }
        if (type === "Featuring") {
            const { featuring } = req.body;
            const FeaturingItem = await layout_model_1.default.findOne({ type: "Featuring" });
            const featuringItems = await Promise.all(featuring.map(async (item) => {
                return {
                    name: item.name,
                    title: item.title,
                    description: item.description,
                };
            }));
            await layout_model_1.default.findByIdAndUpdate(FeaturingItem?._id, { type: "Featuring", featuring: featuringItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesData = await layout_model_1.default.findOne({ type: "Categories" });
            const categoriesItems = await Promise.all(categories.map(async (item) => {
                return {
                    title: item.title,
                };
            }));
            await layout_model_1.default.findByIdAndUpdate(categoriesData?._id, {
                type: "Categories",
                categories: categoriesItems,
            });
        }
        res.status(200).json({
            success: true,
            message: "Layout updated successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
//get layout by type
exports.getLayoutByType = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.params;
        const layout = await layout_model_1.default.findOne({ type });
        res.status(201).json({
            success: true,
            layout,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});

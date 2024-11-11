import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary";

//create Layout
// Helper function to create a banner layout
async function createBannerLayout(data: any) {
    const { image, title, subTitle, text } = data;
    const myCloud = await cloudinary.v2.uploader.upload(image, { folder: "layout" });
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
export const createLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { type } = req.body;
    const isTypeExist = await LayoutModel.findOne({ type });
    if (isTypeExist) {
        return next(new ErrorHandler(`${type} already exists`, 400));
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
            return next(new ErrorHandler("Invalid layout type", 400));
    }

    const createdLayout = await LayoutModel.create(layoutData);
    res.status(200).json({
        success: true,
        message: "Layout created successfully",
        layout: createdLayout
    });
});

//edit layout
export const editLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.body;

        if (type === "Banner") {
            const bannerData: any = await LayoutModel.findOne({ type: "Banner" });

            const { image, title, subTitle, text } = req.body;

            const data = image.startsWith("https")
                ? bannerData
                : await cloudinary.v2.uploader.upload(image, {
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
            }
            await LayoutModel.findByIdAndUpdate(bannerData._id, { banner });
        }
        if (type === "Featuring") {
            const { featuring } = req.body;
            const FeaturingItem = await LayoutModel.findOne({ type: "Featuring" });
            const featuringItems = await Promise.all(
                featuring.map(async (item: any) => {
                    return {
                        name: item.name,
                        title: item.title,
                        description: item.description,
                    };
                })
            );
            await LayoutModel.findByIdAndUpdate(FeaturingItem?._id, { type: "Featuring", featuring: featuringItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesData = await LayoutModel.findOne({ type: "Categories" });
            const categoriesItems = await Promise.all(
                categories.map(async (item: any) => {
                    return {
                        title: item.title,
                    };
                })
            );
            await LayoutModel.findByIdAndUpdate(categoriesData?._id, {
                type: "Categories",
                categories: categoriesItems,
            });
        }

        res.status(200).json({
            success: true,
            message: "Layout updated successfully",
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});

//get layout by type
export const getLayoutByType = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.params;
        const layout = await LayoutModel.findOne({ type });
        res.status(201).json({
            success: true,
            layout,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500))
    }
});
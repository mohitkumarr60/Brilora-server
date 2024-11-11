import { Schema, model, Document } from "mongoose";

interface FeaturingItem extends Document {
    name: string;
    title: string;
    description: string;
}

interface Category extends Document {
    title: string;
}

interface BannerImage extends Document {
    public_id: string;
    url: string;
}

interface Layout extends Document {
    type: string;
    featuring: FeaturingItem[];
    categories: Category[];
    banner: {
        image: BannerImage;
        title: string;
        subTitle: string;
        text: string;
    };
}

const featuringItemSchema = new Schema<FeaturingItem>({
    name: { type: String },
    title: { type: String },
    description: { type: String },
});

const categorySchema = new Schema<Category>({
    title: { type: String },
});

const bannerImageSchema = new Schema<BannerImage>({
    public_id: { type: String },
    url: { type: String },
});

const layoutSchema = new Schema<Layout>({
    type: { type: String },
    featuring: [featuringItemSchema],
    categories: [categorySchema],
    banner: {
        image: bannerImageSchema,
        title: { type: String },
        subTitle: { type: String },
        text: { type: String },
    },
});

const LayoutModel = model<Layout>("Layout", layoutSchema);

export default LayoutModel;
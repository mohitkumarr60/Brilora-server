import mongoose, { Document, Model, Schema } from "mongoose";

interface IFeatured extends Document {
  featuredCourses: string[];
}

const featuredSchema = new Schema<IFeatured>({
  featuredCourses: [{ type: String, required: true }],
});

const FeaturedModel: Model<IFeatured> = mongoose.model("Featured", featuredSchema);

export default FeaturedModel;

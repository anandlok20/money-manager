import mongoose, { Schema, Document, Model } from 'mongoose';
import { CategoryType } from '@/types';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: CategoryType;
  isActive: boolean;
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(CategoryType),
      required: [true, 'Category type is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
    },
    color: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CategorySchema.index({ userId: 1, type: 1, isActive: 1 });

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;

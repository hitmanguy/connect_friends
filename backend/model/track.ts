import mongoose, { Schema, Types } from "mongoose";

export type TaskCategory = "work" | "personal" | "break" | "custom";
export type TaskPriority = "low" | "medium" | "high";

export interface ITracker {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description?: string;
  day: string;
  startMin: number;
  endMin: number;
  category: TaskCategory;
  priority: TaskPriority;
  color?: string;
  tags: string[];
  done: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TrackerSchema = new Schema<ITracker>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    day: { type: String, required: true, index: true }, // YYYY-MM-DD
    startMin: { type: Number, min: 0, max: 1440, default: 9 * 60 },
    endMin: { type: Number, min: 0, max: 1440, default: 10 * 60 },
    category: {
      type: String,
      enum: ["work", "personal", "break", "custom"],
      default: "work",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },
    color: { type: String },
    tags: { type: [String], default: [] },
    done: { type: Boolean, default: false, index: true },
    expiresAt: { type: Date, expires: 0 },
  },
  { timestamps: true }
);

TrackerSchema.index({ userId: 1, day: 1, startMin: 1 });
TrackerSchema.index({ userId: 1, day: 1, updatedAt: -1 });

export const TrackerModel =
  (mongoose.models?.Tracker as mongoose.Model<ITracker>) ||
  mongoose.model<ITracker>("Tracker", TrackerSchema);

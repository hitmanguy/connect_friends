import mongoose, { Schema, Types } from "mongoose";

export type StrokePoint = { x: number; y: number };
export type Stroke = { points: StrokePoint[] };

export interface INote {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  day: string;
  text: string;
  lines: Stroke[];
  createdAt: Date;
  updatedAt: Date;
}

const StrokeSchema = new Schema<Stroke>(
  {
    points: [
      {
        x: { type: Number, min: 0, max: 1, required: true },
        y: { type: Number, min: 0, max: 1, required: true },
        _id: false,
      },
    ],
  },
  { _id: false }
);

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    day: { type: String, required: true, index: true },
    text: { type: String, default: "", maxlength: 4000 },
    lines: { type: [StrokeSchema], default: [] },
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, day: 1, updatedAt: -1 });

export const NoteModel =
  (mongoose.models?.Note as mongoose.Model<INote>) ||
  mongoose.model<INote>("Note", NoteSchema);

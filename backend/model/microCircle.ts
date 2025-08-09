import mongoose, { InferSchemaType } from "mongoose";

const microCircleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      default: "#3b82f6",
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const MicroCircle =
  mongoose.models?.MicroCircle ||
  mongoose.model("MicroCircle", microCircleSchema);
export type MicroCircleType = InferSchemaType<typeof microCircleSchema>;

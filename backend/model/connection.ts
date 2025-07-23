import { Schema, model, models } from "mongoose";

const connectionSchema = new Schema(
  {
    userA: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true, // Always the host
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    notes: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

// Ensure no duplicate connections
connectionSchema.index({ userA: 1, userB: 1 }, { unique: true });

export const Connection =
  models.Connection || model("Connection", connectionSchema);

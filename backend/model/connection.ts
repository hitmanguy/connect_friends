// backend/model/connection.ts
import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Always the host
    },
    microCircleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MicroCircle",
      required: false,
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

export const Connection = mongoose.model("Connection", connectionSchema);

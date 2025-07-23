import mongoose from "mongoose";

const connectionLedgerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["CREATED", "DELETED", "UPDATED"],
      required: true,
    },
    initiatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Connection",
      required: false,
    },
    microCircleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MicroCircle",
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const ConnectionLedger =
  mongoose.models?.ConnectionLedger ||
  mongoose.model("ConnectionLedger", connectionLedgerSchema);

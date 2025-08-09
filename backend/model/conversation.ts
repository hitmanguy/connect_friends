import { Schema, model, Types, models } from "mongoose";

export interface ConversationType {
  _id?: Types.ObjectId | string;
  participants: Types.ObjectId[];
  messages: {
    _id?: Types.ObjectId | string;
    sender: Types.ObjectId;
    content?: string;
    attachments?: { url: string; type: string }[];
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationType>({
  participants: [{ type: Types.ObjectId, ref: "User", required: true }],
  messages: [
    {
      sender: { type: Types.ObjectId, ref: "User", required: true },
      content: { type: String },
      attachments: [
        {
          url: { type: String, required: true },
          type: {
            type: String,
            enum: ["image", "video", "file"],
            required: true,
          },
        },
      ],
      createdAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Conversation =
  models?.Conversation ||
  model<ConversationType>("Conversation", ConversationSchema);

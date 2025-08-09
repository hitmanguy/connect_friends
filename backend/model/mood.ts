import mongoose, { InferSchemaType } from "mongoose";

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "video"],
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
});

const customVersionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  notes: {
    type: String,
  },
  mediaurls: [
    {
      type: String,
    },
  ],
});

const microCircleShareSchema = new mongoose.Schema({
  memberIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  customNotes: {
    type: String,
  },
  mediaurls: [
    {
      type: String,
    },
  ],
});

const moodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    localDate: {
      type: String,
      required: true,
    },
    mood: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    activities: [
      {
        type: String,
      },
    ],
    notes: {
      type: String,
    },
    privateNotes: {
      type: String,
    },
    media: [mediaSchema],
    music: {
      title: String,
      url: String,
      platform: {
        type: String,
        enum: ["spotify", "youtube", "youtubeMusic", "appleMusic", "other"],
      },
    },
    sharing: {
      isPrivate: {
        type: Boolean,
        default: false,
      },
      sharedWith: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      customVersions: [customVersionSchema],
      sharedWithCircles: [microCircleShareSchema],
    },
  },
  { timestamps: true }
);

moodSchema.index(
  { userId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { date: { $type: "date" } },
  }
);

export const Mood = mongoose.models?.Mood || mongoose.model("Mood", moodSchema);
export type MoodType = InferSchemaType<typeof moodSchema>;

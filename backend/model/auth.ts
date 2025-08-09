import { Schema, models, model, InferSchemaType } from "mongoose";

export const userRoles = ["user", "host"] as const;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    username: {
      type: String,
    },
    verificationType: {
      type: String,
      enum: ["email", "google"],
    },
    password: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    UserRole: {
      type: String,
      enum: userRoles,
      default: "user",
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    profileImage: {
      type: String,
      required: false,
    },
    profileImagePublicId: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const oAuthProviders = ["google"] as const;
const oauthAccountSchema = new Schema({
  provider: {
    type: String,
    required: true,
    enum: ["google"],
  },
  providerAccountId: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

oauthAccountSchema.index(
  { provider: 1, providerAccountId: 1 },
  { unique: true }
);

export const User = models?.User || model("User", UserSchema);
export const OAuthAccount =
  models?.OAuthAccount || model("OAuthAccount", oauthAccountSchema);

export type UserType = InferSchemaType<typeof UserSchema>;

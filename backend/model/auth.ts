import { model,Schema ,models,Model } from 'mongoose';

export const userRoles = ['user', 'host'] as const;

import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username?: string;
  verified: boolean;
  verificationType?: 'email' | 'google';
  password: string;
  salt: string;
  UserRole: typeof userRoles[number];
  createdAt: Date;
}

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  username: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationType: {
    type: String, 
    enum: ['email', 'google'],
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
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = models?.Users || model("Users", UserSchema);
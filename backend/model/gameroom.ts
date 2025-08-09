import { Schema, model, models, Types } from "mongoose";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface IRoomPlayer {
  userId: string;
  username: string;
  isReady: boolean;
  isBot?: boolean;
  avatarUrl?: string;
}

export interface IGameSettings {
  enableBots: boolean;
  botCount: number;
  turnTimeLimit: number;
}

export interface IGameRoom {
  _id: Types.ObjectId;
  id: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  singlePlayer: boolean;
  players: IRoomPlayer[];
  gameSettings: IGameSettings;
  finishedOrder?: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const PlayerSchema = new Schema<IRoomPlayer>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    isReady: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false },
    avatarUrl: { type: String, default: null },
  },
  { _id: false }
);

const GameRoomSchema = new Schema<IGameRoom>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hostId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["waiting", "playing", "finished"],
      default: "waiting",
      index: true,
    },
    maxPlayers: { type: Number, default: 4, min: 2, max: 10 },
    singlePlayer: { type: Boolean, default: false },
    players: { type: [PlayerSchema], default: [] },
    gameSettings: {
      enableBots: { type: Boolean, default: true },
      botCount: { type: Number, default: 0 },
      turnTimeLimit: { type: Number, default: 30 },
    },
    finishedOrder: { type: [String], default: [] },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const GameRoomModel =
  models?.GameRoom || model<IGameRoom>("GameRoom", GameRoomSchema);

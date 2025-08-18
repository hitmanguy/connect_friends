import z from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import {
  GameRoomModel,
  type IGameRoom,
  type IRoomPlayer,
} from "../model/gameroom";
import {
  UnoGameState,
  createInitialState,
  playCardMove,
  drawCardMove,
  callUnoMove,
  canPlayCard,
} from "../boardgames/uno/setup";
import { User } from "../model/auth";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";

type GameServerData = {
  matchID: string;
  playerMapping: Record<string, string>;
  gameState: UnoGameState;
};
type MemoryRoom = {
  id: string;
  hostId: string;
  status: "waiting" | "playing" | "finished";
  maxPlayers: number;
  players: IRoomPlayer[];
  gameSettings: IGameRoom["gameSettings"];
  gameServerData?: GameServerData;
  updatedAt: Date;
};
const gameRoomManager = new Map<string, MemoryRoom>();

const botTimers = new Map<string, NodeJS.Timeout>();
const turnTimers = new Map<string, NodeJS.Timeout>();
const processingRooms = new Set<string>();
function tryLock(roomId: string) {
  if (processingRooms.has(roomId)) return false;
  processingRooms.add(roomId);
  return true;
}
function unlock(roomId: string) {
  processingRooms.delete(roomId);
}

function clearTurnTimer(roomId: string) {
  const t = turnTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(roomId);
  }
}

function clearBotTimer(roomId: string) {
  const t = botTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    botTimers.delete(roomId);
  }
}

function isBotsTurn(room: MemoryRoom) {
  const state = room.gameServerData?.gameState;
  if (!state || state.gamePhase !== "playing") return false;
  const cur = state.currentPlayer;
  const curP = state.players[cur];
  const finished =
    state.finishedOrder?.includes(cur) || curP?.hand?.length === 0;
  return !!curP && curP.isBot && !finished;
}

function scheduleTurnTimer(room: MemoryRoom) {
  clearTurnTimer(room.id);
  if (!room.gameServerData) return;
  const state = room.gameServerData.gameState;
  if (state.gamePhase !== "playing") return;
  const remaining = Math.max(
    0,
    state.turnTimeLimit - (Date.now() - state.turnStartTime)
  );
  const t = setTimeout(() => onTurnTimeout(room.id), remaining);
  turnTimers.set(room.id, t);
}

function emitState(roomId: string) {
  const mem = gameRoomManager.get(roomId);
  roomEvents.emit(`state:${roomId}`, {
    roomId,
    gameRoom: mem ? toPublicRoom(mem) : null,
    gameState: mem?.gameServerData?.gameState ?? null,
  });
}

function onTurnTimeout(roomId: string) {
  if (!tryLock(roomId)) {
    setTimeout(() => onTurnTimeout(roomId), 60);
    return;
  }
  try {
    const room = gameRoomManager.get(roomId);
    if (!room?.gameServerData) return;
    const state = room.gameServerData.gameState;
    if (state.gamePhase !== "playing") {
      clearTurnTimer(roomId);
      clearBotTimer(roomId);
      emitState(roomId);
      return;
    }
    const pid = state.currentPlayer;
    const res = drawCardMove(state, pid);
    if (!res?.error) {
      room.updatedAt = new Date();
      scheduleTurnTimer(room);
      if (isBotsTurn(room)) scheduleBots(room);
      else clearBotTimer(room.id);
      emitState(roomId);
    }
  } finally {
    unlock(roomId);
  }
}

const BOT_DELAY_MS = 2500;

function pickBestColor(hand: UnoGameState["players"][string]["hand"]) {
  const counts: Record<"red" | "blue" | "green" | "yellow", number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
  };
  for (const c of hand) if (c.color !== "wild") counts[c.color]++;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "red") as "red" | "blue" | "green" | "yellow";
}

function chooseBotMove(state: UnoGameState, pid: string) {
  const me = state.players[pid];
  if (!me) return { type: "draw" } as const;
  for (let i = 0; i < me.hand.length; i++) {
    const c = me.hand[i];
    if (
      c.type === "number" &&
      canPlayCard(state, pid, c) &&
      c.value === state.lastPlayedCard.value
    ) {
      return { type: "play", idx: i, color: undefined } as const;
    }
  }
  for (let i = 0; i < me.hand.length; i++) {
    const c = me.hand[i];
    if (canPlayCard(state, pid, c)) {
      return {
        type: "play",
        idx: i,
        color: c.type === "wild" ? pickBestColor(me.hand) : undefined,
      } as const;
    }
  }
  return { type: "draw" } as const;
}

function runOneBotTurn(roomId: string) {
  if (!tryLock(roomId)) {
    setTimeout(() => runOneBotTurn(roomId), 60);
    return;
  }
  try {
    const room = gameRoomManager.get(roomId);
    if (!room?.gameServerData) return;
    const state = room.gameServerData.gameState;
    if (state.gamePhase !== "playing") return;
    const pid = state.currentPlayer;
    const player = state.players[pid];
    if (!player?.isBot) return;

    const move = chooseBotMove(state, pid);
    if (move.type === "play") {
      const res = playCardMove(state, pid, move.idx, move.color);
      if (res?.error) drawCardMove(state, pid);
    } else {
      drawCardMove(state, pid);
    }

    if (state.gamePhase !== "playing") {
      clearTurnTimer(room.id);
      clearBotTimer(room.id);
      void updateRoomStatus(room.id, "finished", state.finishedOrder ?? []);
    } else {
      scheduleTurnTimer(room);
      if (isBotsTurn(room)) scheduleBots(room);
      else clearBotTimer(room.id);
    }
    room.updatedAt = new Date();
    emitState(room.id);
  } finally {
    unlock(roomId);
  }
}

function scheduleBots(room: MemoryRoom, delayMs = BOT_DELAY_MS) {
  if (!isBotsTurn(room)) return;
  if (botTimers.has(room.id)) return;
  const t = setTimeout(() => {
    botTimers.delete(room.id);
    runOneBotTurn(room.id);
    const r = gameRoomManager.get(room.id);
    if (r && isBotsTurn(r)) scheduleBots(r, delayMs);
  }, delayMs);
  botTimers.set(room.id, t);
}

function toPublicRoom(mem: MemoryRoom): IGameRoom {
  return {
    _id: undefined as any,
    id: mem.id,
    hostId: mem.hostId,
    status: mem.status,
    maxPlayers: mem.maxPlayers,
    singlePlayer: false,
    players: mem.players,
    gameSettings: mem.gameSettings,
    finishedOrder: mem.gameServerData?.gameState?.finishedOrder ?? [],
    createdAt: mem.updatedAt,
    updatedAt: mem.updatedAt,
  } as unknown as IGameRoom;
}

async function loadRoomFromDB(roomId: string): Promise<MemoryRoom | null> {
  const doc = await GameRoomModel.findOne({ id: roomId })
    .lean<IGameRoom>()
    .exec();
  if (!doc) return null;
  let mem = gameRoomManager.get(doc.id);
  if (!mem) {
    mem = {
      id: doc.id,
      hostId: doc.hostId,
      status: doc.status,
      maxPlayers: doc.maxPlayers,
      players: doc.players,
      gameSettings: doc.gameSettings,
      updatedAt: new Date(doc.updatedAt),
    };
    gameRoomManager.set(doc.id, mem);
  } else {
    mem.hostId = doc.hostId;
    mem.status = doc.status;
    mem.maxPlayers = doc.maxPlayers;
    mem.players = doc.players;
    mem.gameSettings = doc.gameSettings;
    mem.updatedAt = new Date(doc.updatedAt);
  }
  return mem;
}

async function updateRoomStatus(
  id: string,
  status: "waiting" | "playing" | "finished",
  finishedOrder?: string[]
) {
  const patch: Partial<IGameRoom> = { status };
  if (status === "finished") {
    (patch as any).expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    if (finishedOrder) (patch as any).finishedOrder = finishedOrder;
  }
  await GameRoomModel.updateOne({ id }, { $set: patch }).exec();
  if (status !== "playing") {
    clearTurnTimer(id);
    clearBotTimer(id);
  }
}

const createRoomSchema = z.object({
  mode: z.enum(["bots", "multiplayer"]),
  maxPlayers: z.number().min(2).max(10).default(4),
  enableBots: z.boolean().default(true),
  botCount: z.number().min(0).max(9).default(3),
  turnTimeLimit: z.number().min(10).max(120).default(30),
});
const joinSchema = z.object({ roomId: z.string().min(3) });
const roomIdSchema = z.object({ roomId: z.string().min(3) });
const toggleReadySchema = z.object({ roomId: z.string().min(3) });
const startGameInputSchema = z.object({
  roomId: z.string().min(3),
  botCount: z.number().min(0).max(9).optional(),
});
const gameActionSchema = z.object({
  roomId: z.string().min(3),
  action: z.enum(["playCard", "drawCard", "callUno"]),
  cardIndex: z.number().optional(),
  chosenColor: z.enum(["red", "blue", "green", "yellow"]).optional(),
});

function genRoomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

type RoomChatMessage = {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  ts: number;
};

function ensureRoomChat(room: any) {
  if (!room.chat) room.chat = [] as RoomChatMessage[];
  return room.chat as RoomChatMessage[];
}

const roomEvents = new EventEmitter();
roomEvents.setMaxListeners(0);

export const boardgamesRouter = createTRPCRouter({
  createGameRoom: protectedProcedure
    .input(createRoomSchema)
    .mutation(async ({ input, ctx }) => {
      const code = genRoomCode();
      const userId = ctx.user._id.toString();
      const userobj = await User.findById(
        userId,
        "username profileImage"
      ).lean<{ username: string; profileImage: string }>();

      const me: IRoomPlayer = {
        userId,
        username: userobj?.username ?? "Player",
        isReady: true,
        isBot: false,
        avatarUrl: userobj?.profileImage,
      };

      const effectiveEnableBots =
        input.mode === "bots" ? true : input.enableBots;
      const maxBotsAllowed =
        input.mode === "bots" ? 9 : Math.max(0, input.maxPlayers - 2);
      const effectiveBotCount = effectiveEnableBots
        ? Math.min(input.botCount, maxBotsAllowed)
        : 0;

      const doc = await GameRoomModel.create({
        id: code,
        hostId: userId,
        status: "waiting",
        maxPlayers:
          input.mode === "bots"
            ? Math.min(10, Math.max(2, 1 + effectiveBotCount))
            : input.maxPlayers,
        singlePlayer: input.mode === "bots",
        players: [me],
        gameSettings: {
          enableBots: effectiveEnableBots,
          botCount: effectiveBotCount,
          turnTimeLimit: input.turnTimeLimit,
        },
      });

      await loadRoomFromDB(doc.id);
      return { gameRoom: doc.toObject() as IGameRoom };
    }),

  listOpenRooms: protectedProcedure.query(async () => {
    const rooms = await GameRoomModel.find({
      status: "waiting",
      singlePlayer: false,
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean<IGameRoom>()
      .exec();
    return { code: "OK" as const, gameRooms: rooms };
  }),

  getGameRoom: protectedProcedure
    .input(roomIdSchema)
    .query(async ({ input }) => {
      const doc = await GameRoomModel.findOne({ id: input.roomId })
        .lean<IGameRoom>()
        .exec();
      if (!doc)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      return { code: "OK" as const, gameRoom: doc };
    }),

  joinRoom: protectedProcedure
    .input(joinSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user._id.toString();
      const doc = await GameRoomModel.findOne({ id: input.roomId }).exec();
      if (!doc)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      if (doc.status !== "waiting")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already started",
        });
      if (doc.singlePlayer)
        throw new TRPCError({ code: "FORBIDDEN", message: "Bots-only room" });

      const exists = doc.players.find((p: IRoomPlayer) => p.userId === userId);
      const userObj = await User.findById(
        userId,
        "username profileImage"
      ).lean<{ username: string; profileImage: string }>();
      if (!exists) {
        if (doc.players.length >= doc.maxPlayers)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Room full" });
        doc.players.push({
          userId,
          username: userObj?.username ?? "Player",
          isReady: false,
          isBot: false,
          avatarUrl: userObj?.profileImage || undefined,
        });
      } else {
        exists.username = userObj?.username ?? exists.username;
        exists.avatarUrl = userObj?.profileImage || exists.avatarUrl;
      }
      await doc.save();
      await loadRoomFromDB(doc.id);
      return { gameRoom: doc.toObject() as IGameRoom };
    }),

  leaveRoom: protectedProcedure
    .input(roomIdSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user._id.toString();
      const doc = await GameRoomModel.findOne({ id: input.roomId }).exec();
      if (!doc) return { code: "OK" as const };

      if (doc.status === "playing" && !doc.singlePlayer) {
        const me = doc.players.find((p: IRoomPlayer) => p.userId === userId);
        if (me) {
          me.isBot = true;
          me.username = me.username || "Bot";
        }
        await doc.save();

        const mem = gameRoomManager.get(doc.id);
        if (mem?.gameServerData) {
          const pid = mem.gameServerData.playerMapping[userId];
          if (pid !== undefined) {
            const st = mem.gameServerData.gameState;
            if (st.players[pid]) {
              st.players[pid].isBot = true;
              st.players[pid].username = st.players[pid].username || "Bot";
            }
          }
        }
      } else {
        doc.players = doc.players.filter(
          (p: IRoomPlayer) => p.userId !== userId
        );
        if (doc.players.length === 0) {
          await GameRoomModel.deleteOne({ id: doc.id }).exec();
          gameRoomManager.delete(doc.id);
          clearTurnTimer(doc.id);
          clearBotTimer(doc.id);
          emitState(doc.id);
          return { code: "OK" as const };
        }
        if (doc.hostId === userId) {
          const nextHost =
            doc.players.find((p: IRoomPlayer) => !p.isBot) ?? doc.players[0];
          if (nextHost) doc.hostId = nextHost.userId;
        }
        await doc.save();
      }

      const humansLeft = doc.players.filter(
        (p: IRoomPlayer) => !p.isBot
      ).length;
      if (humansLeft === 0) {
        await GameRoomModel.deleteOne({ id: doc.id }).exec();
        gameRoomManager.delete(doc.id);
        clearTurnTimer(doc.id);
        clearBotTimer(doc.id);
        emitState(doc.id);
        return { code: "OK" as const };
      }

      await loadRoomFromDB(doc.id);
      emitState(doc.id);
      return { code: "OK" as const };
    }),

  toggleReady: protectedProcedure
    .input(toggleReadySchema)
    .mutation(async ({ input, ctx }) => {
      const doc = await GameRoomModel.findOne({ id: input.roomId }).exec();
      if (!doc)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      if (doc.status !== "waiting")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already started",
        });
      const me = doc.players.find(
        (p: IRoomPlayer) => p.userId === ctx.user._id.toString()
      );
      if (!me)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a player" });
      me.isReady = !me.isReady;
      await doc.save();
      await loadRoomFromDB(doc.id);
      return { code: "OK" as const, gameRoom: doc.toObject() as IGameRoom };
    }),

  startUnoGame: protectedProcedure
    .input(startGameInputSchema)
    .mutation(async ({ input, ctx }) => {
      const doc = await GameRoomModel.findOne({ id: input.roomId }).exec();
      if (!doc)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      if (doc.hostId !== ctx.user._id.toString())
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only host can start",
        });
      if (doc.status !== "waiting")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already started",
        });

      const humanCount = doc.players.filter(
        (p: IRoomPlayer) => !p.isBot
      ).length;
      if (!doc.singlePlayer && humanCount < 2)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Need at least 2 human players (host + 1)",
        });

      if (!doc.singlePlayer && typeof input.botCount === "number") {
        const maxBotsAllowed = Math.max(
          0,
          doc.maxPlayers - Math.max(humanCount, 2)
        );
        doc.gameSettings.botCount = Math.min(input.botCount, maxBotsAllowed);
        doc.gameSettings.enableBots = doc.gameSettings.botCount > 0;
      }

      const currentBots = doc.players.filter(
        (p: IRoomPlayer) => p.isBot
      ).length;
      const availableSlots = Math.max(0, doc.maxPlayers - doc.players.length);
      const toAdd = Math.min(
        Math.max(0, (doc.gameSettings.botCount ?? 0) - currentBots),
        availableSlots
      );
      for (let i = 0; i < toAdd; i++) {
        doc.players.push({
          userId: `bot_${Date.now()}_${i}`,
          username: `Bot ${currentBots + i + 1}`,
          isReady: true,
          isBot: true,
        });
      }

      const playerMapping: Record<string, string> = {};
      doc.players.forEach(
        (p: IRoomPlayer, i: number) => (playerMapping[p.userId] = String(i))
      );

      const initial = createInitialState({
        players: doc.players.map((p: IRoomPlayer) => ({
          userId: p.userId,
          username: p.username,
          isBot: p.isBot,
          avatarUrl: (p as any).avatarUrl,
        })),
        turnTimeLimitSec: doc.gameSettings.turnTimeLimit,
      });

      doc.status = "playing";
      await doc.save();

      gameRoomManager.set(doc.id, {
        id: doc.id,
        hostId: doc.hostId,
        status: "playing",
        maxPlayers: doc.maxPlayers,
        players: doc.players,
        gameSettings: doc.gameSettings,
        updatedAt: new Date(doc.updatedAt),
        gameServerData: {
          matchID: doc.id,
          playerMapping,
          gameState: initial,
        },
      });

      const mem = gameRoomManager.get(doc.id)!;
      scheduleTurnTimer(mem);
      if (isBotsTurn(mem)) scheduleBots(mem);
      else clearBotTimer(mem.id);

      emitState(mem.id);

      return { gameRoom: doc.toObject() as IGameRoom };
    }),

  makeGameMove: protectedProcedure
    .input(gameActionSchema)
    .mutation(async ({ input, ctx }) => {
      const room = gameRoomManager.get(input.roomId);
      if (!room?.gameServerData)
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      if (room.status !== "playing")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game not active",
        });

      // lock
      if (!tryLock(room.id)) {
        await new Promise((r) => setTimeout(r, 60));
        if (!tryLock(room.id))
          throw new TRPCError({ code: "CONFLICT", message: "Try again" });
      }
      try {
        const state = room.gameServerData.gameState;
        const playerID =
          room.gameServerData.playerMapping[ctx.user._id.toString()];
        if (playerID === undefined)
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a player" });

        let res: any;
        if (input.action === "playCard") {
          if (typeof input.cardIndex !== "number")
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "cardIndex required",
            });
          res = playCardMove(
            state,
            playerID,
            input.cardIndex,
            input.chosenColor
          );
        } else if (input.action === "drawCard") {
          res = drawCardMove(state, playerID);
        } else if (input.action === "callUno") {
          res = callUnoMove(state, playerID);
        }

        if (res?.error)
          throw new TRPCError({ code: "BAD_REQUEST", message: res.error });

        if (state.gamePhase !== "playing") {
          clearTurnTimer(room.id);
          clearBotTimer(room.id);
          await updateRoomStatus(
            room.id,
            "finished",
            state.finishedOrder ?? []
          );
        } else {
          scheduleTurnTimer(room);
          if (isBotsTurn(room)) scheduleBots(room);
          else clearBotTimer(room.id);
        }
        room.updatedAt = new Date();

        emitState(room.id);

        return { code: "OK" as const, gameState: state };
      } finally {
        unlock(room.id);
      }
    }),

  getGameState: protectedProcedure
    .input(roomIdSchema)
    .query(async ({ input, ctx }) => {
      let mem = gameRoomManager.get(input.roomId);
      if (!mem) {
        const loaded = await loadRoomFromDB(input.roomId);
        mem = loaded === null ? undefined : loaded;
      }
      if (!mem)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      if (mem.gameServerData?.gameState?.gamePhase === "playing") {
        scheduleTurnTimer(mem);
        if (isBotsTurn(mem)) scheduleBots(mem);
        else clearBotTimer(mem.id);
      } else {
        clearTurnTimer(mem.id);
        clearBotTimer(mem.id);
      }

      const isPlayer = mem.players.some(
        (p) => p.userId === ctx.user._id.toString()
      );
      const playerID = isPlayer
        ? mem.gameServerData?.playerMapping?.[ctx.user._id.toString()] ?? null
        : null;

      return {
        code: "OK" as const,
        matchID: mem.id,
        playerID,
        gameRoom: toPublicRoom(mem),
        gameState: isPlayer ? mem.gameServerData?.gameState ?? null : null,
      };
    }),
  getPublicProfilesgame: protectedProcedure
    .input(z.object({ roomId: z.string().min(3) }))
    .query(async ({ input }) => {
      const doc = await GameRoomModel.findOne({ id: input.roomId })
        .lean<IGameRoom>()
        .exec();

      const profiles: Record<
        string,
        { userId: string; username: string; profileImage?: string | null }
      > = {};

      if (doc?.players?.length) {
        for (const p of doc.players) {
          profiles[p.userId] = {
            userId: p.userId,
            username: p.username || "Player",
            profileImage: p.avatarUrl || null,
          };
        }
      }
      return { profiles };
    }),

  getRoomChat: protectedProcedure
    .input(z.object({ roomId: z.string(), since: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const room = gameRoomManager.get(input.roomId);
      if (!room)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });

      const isInRoom = room.players.some(
        (p: any) => p.userId === ctx.user._id.toString()
      );
      if (!isInRoom)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a room member",
        });

      const chat = ensureRoomChat(room);
      const since = input.since ?? 0;
      const messages = chat.filter((m) => m.ts > since);
      return { now: Date.now(), messages };
    }),

  postChatMessage: protectedProcedure
    .input(z.object({ roomId: z.string(), text: z.string().min(1).max(400) }))
    .mutation(async ({ input, ctx }) => {
      const room = gameRoomManager.get(input.roomId);
      if (!room)
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });

      const isInRoom = room.players.some(
        (p: any) => p.userId === ctx.user._id.toString()
      );
      if (!isInRoom)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a room member",
        });

      const chat = ensureRoomChat(room);
      const user = await User.findById(
        ctx.user._id,
        "username profileImage"
      ).lean<{ username: string; profileImage?: string | null }>();
      if (!user)
        throw new TRPCError({ code: "FORBIDDEN", message: "User not found" });
      const msg: RoomChatMessage = {
        id: Math.random().toString(36).slice(2),
        userId: ctx.user._id.toString(),
        username: user.username ?? "Player",
        avatarUrl: user.profileImage || undefined,
        text: input.text.trim(),
        ts: Date.now(),
      };
      chat.push(msg);
      if (chat.length > 500) chat.splice(0, chat.length - 500);

      return { ok: true, message: msg };
    }),
  onState: protectedProcedure.input(roomIdSchema).subscription(({ input }) => {
    return observable<{ roomId: string; gameRoom: any; gameState: any }>(
      (emit) => {
        const key = `state:${input.roomId}`;
        const handler = (p: any) => emit.next(p);
        roomEvents.on(key, handler);

        emitState(input.roomId);

        return () => {
          roomEvents.off(key, handler);
        };
      }
    );
  }),
});

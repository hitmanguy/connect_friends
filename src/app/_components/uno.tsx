"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { trpc } from "../../../utils/providers/TrpcProviders";

type UnoColor = "red" | "blue" | "green" | "yellow" | "wild";
type UnoValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wildDraw4";

type UnoCard = {
  type: "number" | "action" | "wild";
  color: UnoColor;
  value: UnoValue;
};

type IRoomPlayer = {
  userId: string;
  username: string;
  isReady: boolean;
  isBot?: boolean;
  avatarUrl?: string;
};
type IGameSettings = {
  enableBots: boolean;
  botCount: number;
  turnTimeLimit: number;
};
type GameRoom = {
  id: string;
  hostId: string;
  status: "waiting" | "playing" | "finished";
  maxPlayers: number;
  singlePlayer: boolean;
  players: IRoomPlayer[];
  gameSettings: IGameSettings;
  finishedOrder?: string[];
};

type UnoGameState = {
  players: Record<
    string,
    {
      hand: UnoCard[];
      hasCalledUno: boolean;
      userId: string;
      isBot: boolean;
      username: string;
      avatarUrl?: string;
    }
  >;
  lastPlayedCard: UnoCard;
  currentColor: "red" | "blue" | "green" | "yellow";
  currentPlayer: string;
  direction: 1 | -1;
  drawCount: number;
  gamePhase: "playing" | "finished";
  winner: string | null;
  skipNextPlayer: boolean;
  turnTimeLimit: number;
  turnStartTime: number;
  gameLog: Array<{
    playerId: string;
    action: string;
    card?: UnoCard;
    timestamp: number;
  }>;
  finishedOrder: string[];
};

const initials = (name: string) =>
  name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";
const avatarFor = (userId?: string, username?: string, provided?: string) =>
  provided ||
  (userId
    ? `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
        username || userId
      )}`
    : `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
        username || "User"
      )}`);

const Avatar: React.FC<{
  name: string;
  src?: string;
  size?: number;
  className?: string;
}> = ({ name, src, size = 28, className }) => {
  const dimension = `${size}px`;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-sky-100 text-sky-700 font-medium ${
        className || ""
      }`}
      style={{ width: dimension, height: dimension }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = avatarFor(
              undefined,
              name
            );
          }}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span className="text-[0.7rem]">{initials(name)}</span>
      )}
    </span>
  );
};

const seasonFor = (d: Date) => {
  const m = d.getMonth();
  if (m === 11 || m === 0) return "winter";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "spring";
};
const UNO_COLORS: Record<Exclude<UnoColor, "wild">, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
};

const UnoGame: React.FC = () => {
  const [mode, setMode] = useState<"bots" | "multiplayer">("bots");
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [enableBots, setEnableBots] = useState<boolean>(true);
  const [botCount, setBotCount] = useState<number>(3);
  const [turnTimeLimit, setTurnTimeLimit] = useState<number>(30);

  const maxBotsAllowedMp = Math.max(0, maxPlayers - 2);
  const botsTooManyMp = mode === "multiplayer" && botCount > maxBotsAllowedMp;
  const invalidMpCombo = mode === "multiplayer" && maxPlayers - botCount < 2;

  const [phase, setPhase] = useState<
    "setup" | "lobby" | "playing" | "finished"
  >("setup");
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [state, setState] = useState<UnoGameState | null>(null);
  const [playerID, setPlayerID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{
    by: string;
    action: string;
    card?: UnoCard;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const [roomId, setRoomId] = useState<string | null>(null);

  type ChatMessage = {
    id: string;
    userId?: string;
    name: string;
    avatar?: string;
    text: string;
    ts: number;
  };
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);
  const chatSinceRef = useRef(0);

  const postChat = trpc.boardgame.postChatMessage.useMutation();
  const chatQuery = trpc.boardgame.getRoomChat.useQuery(
    { roomId: roomId ?? "", since: chatSinceRef.current },
    { enabled: !!roomId, refetchInterval: 1200, refetchOnWindowFocus: false }
  );

  const sendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || !roomId) return;
    postChat.mutate({ roomId, text });
    setChatInput("");
  }, [chatInput, roomId, postChat]);

  const meQuery = trpc.auth.getCurrentUser.useQuery({ fulluser: true });
  const me = meQuery.data?.user;

  const profilesQuery = trpc.boardgame.getPublicProfilesgame.useQuery(
    { roomId: roomId ?? "" },
    { enabled: !!roomId, refetchInterval: 3000 }
  );

  const profileOf = useCallback(
    (userId?: string) => {
      if (!userId)
        return undefined as
          | { username: string; profileImage?: string | null }
          | undefined;
      const p = profilesQuery.data?.profiles?.[userId];
      return p
        ? { username: p.username, profileImage: p.profileImage ?? undefined }
        : undefined;
    },
    [profilesQuery.data?.profiles]
  );

  const createRoom = trpc.boardgame.createGameRoom.useMutation();
  const startGame = trpc.boardgame.startUnoGame.useMutation();
  const joinRoom = trpc.boardgame.joinRoom.useMutation();
  const leaveRoom = trpc.boardgame.leaveRoom.useMutation();
  const toggleReady = trpc.boardgame.toggleReady.useMutation();
  const gameMove = trpc.boardgame.makeGameMove.useMutation();

  const gameRoomQuery = trpc.boardgame.getGameRoom.useQuery(
    { roomId: roomId ?? "" },
    {
      enabled: !!roomId,
      refetchInterval: 1500,
    }
  );

  useEffect(() => {
    if (gameRoomQuery.error) {
      try {
        localStorage.removeItem("uno.roomId");
      } catch {}
      setRoom(null);
      setRoomId(null);
      setState(null);
      setPhase("setup");
    }
  }, [gameRoomQuery.error]);

  const gameStateQuery = trpc.boardgame.getGameState.useQuery(
    { roomId: roomId ?? "" },
    {
      enabled: !!roomId,
      refetchInterval: 1000,
    }
  );

  useEffect(() => {
    const payload = chatQuery.data;
    if (!payload?.messages?.length) return;
    setChat((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev];
      payload.messages.forEach((m: any) => {
        if (!seen.has(m.id)) {
          merged.push({
            id: m.id,
            userId: m.userId,
            name: m.username,
            avatar: m.avatarUrl,
            text: m.text,
            ts: m.ts,
          });
        }
      });
      return merged.sort((a, b) => a.ts - b.ts);
    });
    chatSinceRef.current = payload.now;
  }, [chatQuery.data]);

  useEffect(() => {
    if (!chat.length) return;
    if (chatOpen) return;
    const myId = me?._id;
    const newFromOthers = chat.filter(
      (m) => m.userId && m.userId !== myId
    ).length;
    setChatUnread(newFromOthers);
  }, [chat, chatOpen, me?._id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (roomId) return;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("room");
    const saved = localStorage.getItem("uno.roomId");
    const code = (fromUrl || saved || "").trim();
    if (code) {
      setRoomId(code);
    }
  }, [roomId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!room?.id) return;
    try {
      localStorage.setItem("uno.roomId", room.id);
    } catch {}
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("room") !== room.id) {
        url.searchParams.set("room", room.id);
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
  }, [room?.id]);

  useEffect(() => {
    if (gameRoomQuery.data?.gameRoom) {
      setRoom(gameRoomQuery.data.gameRoom);
      if (gameRoomQuery.data.gameRoom.status === "playing") {
        setPhase("playing");
      } else if (
        gameRoomQuery.data.gameRoom.status === "waiting" &&
        phase === "setup"
      ) {
        setPhase("lobby");
      }
    }
  }, [gameRoomQuery.data?.gameRoom, phase]);

  useEffect(() => {
    const s = gameStateQuery.data?.gameState ?? null;
    if (s) {
      setState(s as UnoGameState);
      setPlayerID(gameStateQuery.data?.playerID ?? null);
      setRoom(gameStateQuery.data?.gameRoom as GameRoom);
      setPhase(s.gamePhase === "finished" ? "finished" : "playing");
    }
  }, [gameStateQuery.data]);

  useEffect(() => {
    if (!state) return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil(
          (state.turnTimeLimit - (Date.now() - state.turnStartTime)) / 1000
        )
      );
      setTimeLeft(left);
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, [state?.turnStartTime, state?.turnTimeLimit]);

  useEffect(() => {
    if (!state?.gameLog?.length) return;
    const last = state.gameLog[state.gameLog.length - 1];
    if (!last) return;
    const show = ["play", "draw", "drawPenalty2", "drawPenalty4", "call-uno"];
    if (!show.includes(last.action)) return;
    setReveal({
      by: state.players[last.playerId]?.username ?? "Player",
      action: last.action,
      card: last.card,
    });
    const t = setTimeout(() => setReveal(null), 1500);
    return () => clearTimeout(t);
  }, [state?.gameLog?.length]);

  const myHand = useMemo(
    () => (state && playerID ? state.players[playerID]?.hand ?? [] : []),
    [state, playerID]
  );
  const iAmFinished = useMemo(
    () => !!state && !!playerID && state.finishedOrder.includes(playerID),
    [state, playerID]
  );
  const isMyTurn = useMemo(
    () =>
      !!state && !!playerID && state.currentPlayer === playerID && !iAmFinished,
    [state, playerID, iAmFinished]
  );

  const activeGlow = useMemo(() => {
    const c = state?.currentColor || "blue";
    return UNO_COLORS[c as Exclude<UnoColor, "wild">] || "#38bdf8";
  }, [state?.currentColor]);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const playBeep = useCallback(
    (
      freq: number,
      duration = 0.12,
      type: OscillatorType = "sine",
      gain = 0.035
    ) => {
      try {
        if (typeof window === "undefined") return;
        const Ctx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = audioCtxRef.current || new Ctx();
        audioCtxRef.current = ctx;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.value = gain;
        osc.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime;
        osc.start(t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.stop(t + duration + 0.01);
      } catch {}
    },
    []
  );

  const sfxFor = useCallback(
    (action: string, val?: UnoValue) => {
      if (action === "play") {
        if (val === "reverse") return playBeep(540, 0.12, "triangle", 0.03);
        if (val === "skip") return playBeep(480, 0.12, "square", 0.03);
        if (val === "draw2" || val === "wildDraw4")
          return playBeep(220, 0.14, "sawtooth", 0.035);
        return playBeep(660, 0.08, "sine", 0.03);
      }
      if (
        action === "draw" ||
        action === "drawPenalty2" ||
        action === "drawPenalty4"
      )
        return playBeep(300, 0.08, "sine", 0.03);
      if (action === "call-uno") return playBeep(800, 0.18, "triangle", 0.03);
    },
    [playBeep]
  );

  useEffect(() => {
    if (!state?.gameLog?.length) return;
    const last = state.gameLog[state.gameLog.length - 1];
    if (!last) return;
    sfxFor(last.action, last.card?.value as UnoValue | undefined);
  }, [state?.gameLog?.length, sfxFor]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPickerOpen(false);
        setPendingIndex(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  const canPlayLocal = useCallback(
    (card: UnoCard): boolean => {
      if (!state || !playerID || !isMyTurn) return false;
      if (card.value === "wild") return true;
      if (card.value === "wildDraw4") {
        const hand = state.players[playerID]?.hand ?? [];
        const hasColor = hand.some(
          (c) => c.color !== "wild" && c.color === state.currentColor
        );
        return !hasColor;
      }
      return (
        card.color === state.currentColor ||
        card.value === state.lastPlayedCard.value
      );
    },
    [state, playerID, isMyTurn]
  );

  useEffect(() => {
    if (!chatOpen) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, chatOpen]);

  const handleCreate = useCallback(async () => {
    setError(null);
    try {
      const effectiveEnableBots = mode === "bots" ? true : enableBots;
      const effectiveBotCount =
        mode === "bots"
          ? Math.max(1, botCount)
          : effectiveEnableBots
          ? Math.min(botCount, maxBotsAllowedMp)
          : 0;

      const res = await createRoom.mutateAsync({
        mode,
        maxPlayers,
        enableBots: effectiveEnableBots,
        botCount: effectiveBotCount,
        turnTimeLimit,
      });
      setRoom(res.gameRoom as GameRoom);
      setRoomId(res.gameRoom.id);
      try {
        localStorage.setItem("uno.roomId", res.gameRoom.id);
      } catch {}
      setPhase("lobby");
    } catch (e: any) {
      setError(e?.message ?? "Failed to create room");
    }
  }, [
    mode,
    maxPlayers,
    enableBots,
    botCount,
    maxBotsAllowedMp,
    turnTimeLimit,
    createRoom,
  ]);

  const handleJoin = useCallback(
    async (code: string) => {
      setError(null);
      try {
        const res = await joinRoom.mutateAsync({ roomId: code });
        setRoom(res.gameRoom as GameRoom);
        setRoomId(res.gameRoom.id);
        try {
          localStorage.setItem("uno.roomId", res.gameRoom.id);
        } catch {}
        setPhase("lobby");
      } catch (e: any) {
        setError(e?.message ?? "Failed to join room");
      }
    },
    [joinRoom]
  );

  const handleLeave = useCallback(async () => {
    try {
      if (roomId) await leaveRoom.mutateAsync({ roomId });
    } catch {}
    try {
      localStorage.removeItem("uno.roomId");
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      window.history.replaceState({}, "", url.toString());
    } catch {}
    setRoomId(null);
    setRoom(null);
    setState(null);
    setPlayerID(null);
    setChat([]);
    setPhase("setup");
  }, [leaveRoom, roomId]);

  const onCardClick = useCallback(
    async (index: number) => {
      if (!room || !state || !isMyTurn) return;
      const c = myHand[index];
      if (!c || !canPlayLocal(c)) return;
      if (c.value === "wild" || c.value === "wildDraw4") {
        setPendingIndex(index);
        setPickerOpen(true);
        return;
      }
      try {
        sfxFor("play", c.value);
        await gameMove.mutateAsync({
          roomId: room.id,
          action: "playCard",
          cardIndex: index,
        });
      } catch {}
    },
    [room, state, myHand, canPlayLocal, isMyTurn, gameMove, sfxFor]
  );

  const playWithColor = useCallback(
    async (color: "red" | "blue" | "green" | "yellow") => {
      if (!room || pendingIndex == null) return;
      try {
        sfxFor("play", myHand[pendingIndex]?.value);
        await gameMove.mutateAsync({
          roomId: room.id,
          action: "playCard",
          cardIndex: pendingIndex,
          chosenColor: color,
        });
      } catch {}
      setPendingIndex(null);
      setPickerOpen(false);
    },
    [room, pendingIndex, gameMove, sfxFor, myHand]
  );

  const handleDraw = useCallback(async () => {
    if (!room || !isMyTurn) return;
    try {
      sfxFor("draw");
      await gameMove.mutateAsync({ roomId: room.id, action: "drawCard" });
    } catch {}
  }, [room, isMyTurn, gameMove, sfxFor]);

  const handleUno = useCallback(async () => {
    if (!room || !isMyTurn) return;
    try {
      await gameMove.mutateAsync({ roomId: room.id, action: "callUno" });
    } catch {}
  }, [room, isMyTurn, gameMove]);

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 py-4">
          <div className="bg-white rounded-2xl shadow border border-sky-200 p-4 sm:p-6">
            <h1 className="text-xl sm:text-3xl font-semibold text-sky-700 mb-4">
              UNO
            </h1>

            <div className="flex gap-2 sm:gap-4 mb-4">
              <button
                className={`flex-1 px-3 sm:px-4 py-2 rounded-md border text-sm sm:text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  mode === "bots"
                    ? "bg-sky-600 text-white border-sky-600 shadow"
                    : "border-sky-300 text-sky-700 bg-white hover:bg-sky-50"
                }`}
                onClick={() => setMode("bots")}
              >
                Play with Bots
              </button>
              <button
                className={`flex-1 px-3 sm:px-4 py-2 rounded-md border text-sm sm:text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  mode === "multiplayer"
                    ? "bg-sky-600 text-white border-sky-600 shadow"
                    : "border-sky-300 text-sky-700 bg-white hover:bg-sky-50"
                }`}
                onClick={() => setMode("multiplayer")}
              >
                Multiplayer
              </button>
            </div>

            {/* Responsive layout: stacked on mobile, 2 columns on lg */}
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
              {/* Create / Settings Card */}
              <div className="p-3 sm:p-4 rounded-xl border border-sky-200 bg-sky-50/40">
                {mode === "multiplayer" && (
                  <div className="mb-3">
                    <label className="text-xs sm:text-sm text-gray-700">
                      Max Players
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {mode === "multiplayer" && (
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <label className="text-xs sm:text-sm text-gray-700">
                      Enable Bots
                    </label>
                    <input
                      type="checkbox"
                      checked={enableBots}
                      onChange={(e) => setEnableBots(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs sm:text-sm text-gray-700">
                    Bots
                  </label>
                  <input
                    type="number"
                    min={mode === "bots" ? 1 : 0}
                    max={mode === "bots" ? 9 : maxBotsAllowedMp}
                    disabled={mode === "multiplayer" ? !enableBots : false}
                    value={Math.min(
                      botCount,
                      mode === "bots" ? 9 : maxBotsAllowedMp
                    )}
                    onChange={(e) => setBotCount(Number(e.target.value))}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm disabled:opacity-50"
                  />
                  {mode === "multiplayer" && (
                    <div className="text-[11px] mt-1 leading-snug">
                      <span className="text-gray-600">
                        Max bots w/ current max players: {maxBotsAllowedMp}
                      </span>
                      {(botsTooManyMp || invalidMpCombo) && (
                        <div className="text-red-600 mt-1">
                          Need at least 2 human players.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-gray-700">
                    Turn Time (seconds)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={turnTimeLimit}
                    onChange={(e) => setTurnTimeLimit(Number(e.target.value))}
                    className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <button
                  className="mt-5 w-full px-4 py-2 rounded-lg bg-sky-600 text-white text-sm sm:text-base hover:bg-sky-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCreate}
                  disabled={
                    createRoom.isPending || botsTooManyMp || invalidMpCombo
                  }
                >
                  {createRoom.isPending ? "Creating..." : "Create Room"}
                </button>
              </div>

              {/* Join Card */}
              <div className="p-3 sm:p-4 rounded-xl border border-sky-200 bg-white">
                <h3 className="font-medium mb-3 text-sky-700 text-sm sm:text-base">
                  Join by Code
                </h3>
                <div className="flex flex-col xs:flex-row gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.trim())}
                    placeholder="Enter room code"
                    className="flex-1 border rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    className="w-full xs:w-auto px-4 py-2 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-50"
                    onClick={() => joinCode && handleJoin(joinCode)}
                    disabled={joinRoom.isPending || !joinCode}
                  >
                    {joinRoom.isPending ? "Joining..." : "Join"}
                  </button>
                </div>
                {joinRoom.isError && (
                  <div className="mt-2 text-xs text-red-600">
                    {(joinRoom.error as any)?.message || "Failed to join"}
                  </div>
                )}
              </div>
            </div>

            <details className="mt-5 group">
              <summary className="list-none cursor-pointer select-none">
                <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-white/80 px-4 py-3">
                  <span className="text-sky-700 font-medium text-sm sm:text-base">
                    UNO Rules (tap to expand)
                  </span>
                  <span className="text-sky-500 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </div>
              </summary>
              <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4 text-[12px] sm:text-sm text-slate-700 leading-relaxed">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Match the top card by color or number/action.</li>
                  <li>
                    Wild changes color. Wild Draw 4: only if no card of current
                    color.
                  </li>
                  <li>Draw 2 / Wild Draw 4 make next player draw & skip.</li>
                  <li>
                    Skip: next player misses turn. Reverse flips direction.
                  </li>
                  <li>
                    Draw one if you can’t play. If playable after drawing, you
                    can play.
                  </li>
                  <li>
                    Call UNO at 2 cards before playing to avoid a penalty.
                  </li>
                  <li>
                    Finish first; round ends when all finish or rules end it.
                  </li>
                </ul>
              </div>
            </details>

            {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  const roomStatus =
    (gameRoomQuery.data?.gameRoom?.status ?? room?.status) || "waiting";
  if (room && roomStatus === "waiting" && !state) {
    const isHost =
      room.hostId ===
      (room.players.find((p) => p.userId === room.hostId)?.userId ?? "");

    const allowedBotsLobby = room.singlePlayer
      ? 9
      : Math.max(0, (room?.maxPlayers ?? 4) - 2);
    const humansInRoom = room.players.filter((p) => !p.isBot).length;

    const allHumansReady = room.players
      .filter((p) => !p.isBot)
      .every((p) => p.isReady);
    const notReady = room.players.filter((p) => !p.isBot && !p.isReady);

    const startDisabled = room.singlePlayer
      ? !allHumansReady
      : humansInRoom < 2 || botCount > allowedBotsLobby || !allHumansReady;

    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow border border-sky-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-2xl font-semibold text-sky-700">Lobby</h2>
              <div className="flex items-center gap-2 sm:gap-3">
                {!room.singlePlayer && (
                  <div className="px-3 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-sm">
                    Code: <span className="font-mono">{room.id}</span>
                  </div>
                )}
                <button
                  className="px-3 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 active:scale-95 transition-all"
                  onClick={() => navigator.clipboard.writeText(room.id)}
                >
                  Copy
                </button>
                <button
                  onClick={handleLeave}
                  className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all"
                >
                  Leave
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h3 className="font-medium mb-2">Players</h3>
                <div className="space-y-2">
                  {room.players.map((p) => {
                    const isMe = me?._id && p.userId === (me as any)._id;
                    const prof = profileOf(p.userId);
                    const displayName =
                      prof?.username ?? (isMe ? me.username : p.username);
                    const displayAvatar =
                      prof?.profileImage ??
                      (isMe
                        ? ((me as any).profileImage as string | undefined)
                        : p.avatarUrl);
                    return (
                      <div
                        key={p.userId}
                        className="border rounded-lg px-3 py-2 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={displayName || "Player"}
                            src={avatarFor(
                              p.userId,
                              displayName || "Player",
                              displayAvatar
                            )}
                            size={28}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {displayName || "Player"}
                            </span>
                            {p.isBot && (
                              <span className="text-[10px] text-purple-600 uppercase tracking-wide">
                                BOT
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-sky-700">
                          {p.isReady ? "Ready" : "Not ready"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Actions</h3>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    className="px-3 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 active:scale-95 transition-all"
                    onClick={async () => {
                      try {
                        await toggleReady.mutateAsync({ roomId: room.id });
                        await gameRoomQuery.refetch();
                      } catch (e: any) {
                        setError(e?.message ?? "Failed to toggle ready");
                      }
                    }}
                  >
                    Toggle Ready
                  </button>

                  {isHost && (
                    <button
                      className={`px-3 py-2 rounded-md text-white transition-all active:scale-95 ${
                        startDisabled
                          ? "bg-green-300 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                      disabled={startDisabled}
                      onClick={async () => {
                        if (!allHumansReady) {
                          setError(
                            "All human players must be Ready before starting."
                          );
                          return;
                        }
                        try {
                          const allowed = Math.min(botCount, allowedBotsLobby);
                          await startGame.mutateAsync({
                            roomId: room.id,
                            botCount: allowed,
                          });
                          await gameRoomQuery.refetch();
                          await gameStateQuery.refetch();
                          setPhase("playing");
                        } catch (e: any) {
                          setError(e?.message ?? "Failed to start");
                        }
                      }}
                    >
                      Start
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {room.singlePlayer
                    ? allHumansReady
                      ? "All set. You can start."
                      : "Waiting for host to toggle Ready."
                    : `Max bots allowed here: ${allowedBotsLobby}. At least 2 humans required.`}
                  {!allHumansReady && notReady.length > 0 && (
                    <div className="mt-1 text-red-600">
                      Waiting on: {notReady.map((p) => p.username).join(", ")}
                    </div>
                  )}
                </div>
                {error && (
                  <div className="mt-3 text-sm text-red-600">{error}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 60% 40%, #e0f2fe 0%, #bae6fd 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 7px 7px",
          opacity: 0.35,
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/3 -left-1/3 w-[80vw] h-[80vw] rounded-full bg-white/5 blur-3xl animate-slowMove" />
        <div className="absolute -bottom-1/3 -right-1/3 w-[70vw] h-[70vw] rounded-full bg-white/5 blur-3xl animate-slowMove2" />
      </div>

      <SeasonalOverlay season={seasonFor(new Date())} />

      <div className="relative max-w-7xl mx-auto p-3 sm:p-6">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow border border-sky-200">
          <div className="p-2 sm:p-4 border-b flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <h2 className="text-lg sm:text-2xl font-semibold text-sky-700 truncate">
                {phase === "finished" ? "Game Over" : "UNO Game"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setChatOpen((v) => {
                      const nv = !v;
                      if (nv) setChatUnread(0);
                      return nv;
                    })
                  }
                  className="relative hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 active:scale-95 transition-all text-sm"
                  title="Chat"
                >
                  Chat
                  {chatUnread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-[11px] leading-[18px] text-white text-center">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleLeave}
                  className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all text-sm sm:text-base"
                >
                  Leave
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {state && (
                <div className="px-2 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[11px] sm:text-xs leading-tight flex items-center gap-1">
                  <span className="font-medium">
                    {state.players[state.currentPlayer]?.username ?? "?"}
                  </span>
                  <span className="opacity-50">•</span>
                  <span className="capitalize">{state.currentColor}</span>
                  <span className="opacity-50">•</span>
                  <span>{timeLeft}s</span>
                </div>
              )}
              {room && (
                <div className="px-2 py-1 rounded-md bg-white border border-sky-200 text-sky-700 text-[11px] sm:text-xs font-mono">
                  {room.id}
                </div>
              )}
              {chatUnread > 0 && !chatOpen && (
                <div className="sm:hidden px-2 py-1 rounded-md bg-red-100 text-red-600 text-[11px] font-medium">
                  {chatUnread} unread
                </div>
              )}
            </div>
          </div>
          {state ? (
            <div className="p-3 sm:p-4">
              <div className="hidden md:block">
                <RoundTable
                  state={state}
                  playerID={playerID}
                  activeGlow={activeGlow}
                />
              </div>

              <div className="md:hidden">
                <div className="rounded-xl bg-gradient-to-b from-sky-50 to-white border border-sky-100 px-3 sm:px-4 py-3 sm:py-4 min-h-[72vh] flex items-center">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start w-full">
                    <div className="space-y-3 sm:space-y-4">
                      {Object.entries(state.players)
                        .filter(([pid]) => pid !== playerID)
                        .slice(
                          0,
                          Math.ceil((Object.keys(state.players).length - 1) / 2)
                        )
                        .map(([pid, p]) => {
                          const isTurn = pid === state.currentPlayer;
                          return (
                            <OpponentTile
                              key={pid}
                              p={p}
                              isTurn={isTurn}
                              activeGlow={activeGlow}
                            />
                          );
                        })}
                    </div>
                    <CenterPiles
                      state={state}
                      activeGlow={activeGlow}
                      compact={true}
                    />

                    <div className="space-y-3 sm:space-y-4">
                      {Object.entries(state.players)
                        .filter(([pid]) => pid !== playerID)
                        .slice(
                          Math.ceil((Object.keys(state.players).length - 1) / 2)
                        )
                        .map(([pid, p]) => {
                          const isTurn = pid === state.currentPlayer;
                          return (
                            <OpponentTile
                              key={pid}
                              p={p}
                              isTurn={isTurn}
                              activeGlow={activeGlow}
                            />
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={
                        state.players[playerID!]?.username ||
                        (meQuery.data?.user?.username ?? "You")
                      }
                      src={
                        state.players[playerID!]?.avatarUrl ||
                        (meQuery.data?.user as any)?.profileImage ||
                        undefined
                      }
                      size={32}
                    />
                    <div className="font-semibold flex items-center gap-2">
                      <span>Your Hand</span>
                      {isMyTurn && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 animate-pulse">
                          YOUR TURN
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {myHand.length} cards
                  </div>
                </div>

                {!iAmFinished ? (
                  <div
                    className="overflow-x-auto overflow-y-visible pb-4 sm:pb-6"
                    style={{
                      paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
                      paddingRight: "max(0.5rem, env(safe-area-inset-right))",
                    }}
                  >
                    <div className="flex gap-2 sm:gap-3 min-w-max overflow-visible snap-x snap-mandatory">
                      {myHand.map((c, idx) => {
                        const playable = canPlayLocal(c);
                        const isPending = idx === pendingIndex;

                        const colorCls =
                          c.color === "red"
                            ? "bg-red-500"
                            : c.color === "blue"
                            ? "bg-blue-500"
                            : c.color === "green"
                            ? "bg-green-500"
                            : c.color === "yellow"
                            ? "bg-yellow-400"
                            : "bg-slate-700";
                        const textCls =
                          c.color === "yellow"
                            ? "text-slate-900"
                            : "text-white";
                        const label = String(c.value ?? "").toUpperCase();
                        const len = label.length;
                        const topSize =
                          len > 8
                            ? "text-[0.65rem]"
                            : len > 6
                            ? "text-[0.8rem]"
                            : "text-[0.95rem]";
                        const bottomSize =
                          len > 8
                            ? "text-[0.7rem]"
                            : len > 6
                            ? "text-[0.9rem]"
                            : "text-[1.05rem]";

                        return (
                          <button
                            data-card
                            key={idx}
                            onClick={() => onCardClick(idx)}
                            className={`snap-start relative w-[4.6rem] h-[6.6rem] sm:w-[5.4rem] sm:h-[7.6rem] rounded-xl border-2 border-white ${textCls} shadow ${colorCls} select-none overflow-hidden transition-transform duration-150 ease-out transform-gpu will-change-transform ${
                              playable
                                ? "hover:scale-[1.03] md:hover:-translate-y-[5px] hover:shadow-lg focus:shadow-lg"
                                : "opacity-80"
                            } ${
                              isPending
                                ? "ring-4 ring-amber-400"
                                : playable
                                ? "ring-2 ring-sky-300"
                                : ""
                            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400`}
                            title={label}
                            aria-label={`Card ${label}`}
                          >
                            <div className="absolute inset-1 rounded-lg border border-white/40 pointer-events-none" />
                            <div
                              className={`absolute top-1.5 left-1.5 font-extrabold leading-none drop-shadow-sm ${topSize}`}
                              style={{
                                textShadow: "0 1px 1px rgba(0,0,0,0.25)",
                              }}
                            >
                              {label}
                            </div>
                            <div
                              className={`absolute bottom-1.5 right-1.5 font-extrabold leading-none drop-shadow-sm ${bottomSize}`}
                              style={{
                                textShadow: "0 1px 1px rgba(0,0,0,0.25)",
                              }}
                            >
                              {label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600">
                    You’ve finished! Waiting for the round to end…
                  </div>
                )}

                {!iAmFinished && (
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={handleDraw}
                      disabled={!isMyTurn}
                      className={`px-4 py-2 rounded-md text-white transition-all active:scale-95 ${
                        isMyTurn
                          ? "bg-sky-600 hover:bg-sky-700"
                          : "bg-sky-300 cursor-not-allowed"
                      }`}
                    >
                      Draw
                    </button>
                    {myHand.length <= 2 && (
                      <button
                        onClick={handleUno}
                        disabled={!isMyTurn}
                        className={`px-4 py-2 rounded-md font-bold transition-all active:scale-95 ${
                          isMyTurn
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-red-300 text-white/80 cursor-not-allowed"
                        }`}
                      >
                        UNO!
                      </button>
                    )}
                  </div>
                )}
              </div>

              {phase === "finished" && (
                <div className="mt-8">
                  <h3 className="font-medium mb-2">Placements</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {state.finishedOrder.map((pid, i) => (
                      <div key={pid} className="border rounded-lg p-3 bg-white">
                        <div className="font-medium">
                          {i + 1}
                          {i === 0
                            ? "st"
                            : i === 1
                            ? "nd"
                            : i === 2
                            ? "rd"
                            : "th"}{" "}
                          — {state.players[pid]?.username}
                        </div>
                        <div className="text-xs text-gray-600">
                          {state.players[pid]?.hand.length ?? 0} cards left
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-600">Loading game…</div>
          )}
        </div>
      </div>

      <button
        onClick={() =>
          setChatOpen((v) => {
            const nv = !v;
            if (nv) setChatUnread(0);
            return nv;
          })
        }
        className="sm:hidden fixed bottom-4 right-4 z-40 rounded-full bg-sky-600 text-white w-12 h-12 shadow-lg active:scale-95 transition-transform"
        title="Chat"
      >
        <span className="text-lg">💬</span>
        {chatUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-[11px] leading-[18px] text-white text-center">
            {chatUnread > 9 ? "9+" : chatUnread}
          </span>
        )}
      </button>

      <div
        className={`fixed z-40 bg-white/95 backdrop-blur-md border border-sky-200 shadow-xl ${
          chatOpen
            ? "right-0 sm:right-4 bottom-0 sm:bottom-auto"
            : "-right-full sm:-right-[28rem] bottom-0 sm:bottom-auto"
        } transition-all duration-300 ease-out w-full sm:w-[26rem] h-[56vh] sm:h-[70vh] sm:top-24 sm:rounded-xl`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-white/60">
            <div className="font-medium text-sky-700">Chat</div>
            <button
              className="text-sm text-gray-500 hover:text-gray-800"
              onClick={() => setChatOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-sky-50/30">
            {chat.map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <Avatar name={m.name} src={m.avatar} size={24} />
                <div className="bg-white border rounded-lg px-3 py-1.5 max-w-[80%]">
                  <div className="text-xs text-gray-500">{m.name}</div>
                  <div className="text-sm">{m.text}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-2 border-t flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message…"
              className="flex-1 border rounded-md px-3 py-2"
            />
            <button
              onClick={sendChat}
              className="px-3 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 active:scale-95 transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </div>
      {pickerOpen && pendingIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setPickerOpen(false);
            setPendingIndex(null);
          }}
        >
          <div
            className="w-full sm:w-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto sm:mx-0 w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-sky-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-slate-700">
                  Choose a color
                </h4>
                <button
                  className="text-sm text-gray-500 hover:text-gray-800"
                  onClick={() => {
                    setPickerOpen(false);
                    setPendingIndex(null);
                  }}
                  aria-label="Close color picker"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => playWithColor("red")}
                  className="h-12 rounded-md bg-red-500 text-white font-semibold shadow hover:brightness-110 active:scale-95 transition"
                  aria-label="Pick Red"
                >
                  Red
                </button>
                <button
                  onClick={() => playWithColor("blue")}
                  className="h-12 rounded-md bg-blue-500 text-white font-semibold shadow hover:brightness-110 active:scale-95 transition"
                  aria-label="Pick Blue"
                >
                  Blue
                </button>
                <button
                  onClick={() => playWithColor("green")}
                  className="h-12 rounded-md bg-green-500 text-white font-semibold shadow hover:brightness-110 active:scale-95 transition"
                  aria-label="Pick Green"
                >
                  Green
                </button>
                <button
                  onClick={() => playWithColor("yellow")}
                  className="h-12 rounded-md bg-yellow-400 text-slate-900 font-semibold shadow hover:brightness-110 active:scale-95 transition"
                  aria-label="Pick Yellow"
                >
                  Yellow
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Playing:{" "}
                {String(myHand[pendingIndex!]?.value ?? "").toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slowMove {
          0% { transform: translate(-10%, -10%) scale(1); }
          50% { transform: translate(10%, 10%) scale(1.05); }
          100% { transform: translate(-10%, -10%) scale(1); }
        }
        @keyframes slowMove2 {
          0% { transform: translate(8%, -6%) scale(1); }
          50% { transform: translate(-6%, 6%) scale(1.06); }
          100% { transform: translate(8%, -6%) scale(1); }
        }
        @keyframes flipIn {
          0% { transform: rotateY(90deg) scale(0.9); opacity:0; }
          100% { transform: rotateY(0) scale(1); opacity:1; }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(234,179,8,0.45); }
          70% { box-shadow: 0 0 0 16px rgba(234,179,8,0); }
          100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); }
        }
      `}</style>
    </div>
  );
};

const CenterPiles: React.FC<{
  state: UnoGameState;
  activeGlow: string;
  compact?: boolean;
}> = ({ state, activeGlow, compact }) => {
  const key = `${state.lastPlayedCard?.color}-${state.lastPlayedCard?.value}`;

  const pileText = useMemo(() => {
    const v = state.lastPlayedCard?.value;
    const raw =
      v === "wildDraw4"
        ? "+4"
        : v === "draw2"
        ? "+2"
        : v === "reverse"
        ? "REVERSE"
        : v === "skip"
        ? "SKIP"
        : v === "wild"
        ? "WILD"
        : String(v ?? "").toUpperCase();
    const len = raw.length;
    const size =
      len >= 7
        ? "text-[0.70rem] sm:text-sm"
        : len >= 5
        ? "text-sm sm:text-base"
        : "text-xl sm:text-2xl";
    return { raw, size };
  }, [state.lastPlayedCard?.value]);

  return (
    <div className={`flex items-center ${compact ? "gap-6" : "gap-8"}`}>
      <div
        className="w-24 h-36 rounded-xl shadow-lg border bg-sky-700/90 relative overflow-hidden rotate-[-6deg] translate-y-1"
        aria-label="Draw pile"
      >
        <div className="absolute inset-2 rounded-lg bg-sky-900/60" />
        <div className="absolute -bottom-1 -right-1 w-24 h-36 rounded-xl border bg-sky-600/90" />
      </div>

      <div
        key={key}
        className="w-24 h-36 rounded-xl shadow-xl border relative overflow-hidden animate-[flipIn_280ms_ease-out]"
        style={{ boxShadow: `0 6px 20px ${activeGlow}40` }}
        aria-label="Discard pile"
      >
        <div
          className={`absolute inset-0 ${
            state.currentColor === "red"
              ? "bg-red-500"
              : state.currentColor === "blue"
              ? "bg-blue-500"
              : state.currentColor === "green"
              ? "bg-green-500"
              : "bg-yellow-400"
          }`}
        />
        <div className="absolute inset-2 rounded-lg bg-white/10" />
        <div className="absolute inset-0 flex items-center justify-center px-2">
          <span
            className={`font-black text-white drop-shadow leading-none tracking-tight whitespace-nowrap ${pileText.size}`}
          >
            {pileText.raw}
          </span>
        </div>
      </div>
    </div>
  );
};

const RoundTable: React.FC<{
  state: UnoGameState;
  playerID: string | null;
  activeGlow: string;
}> = ({ state, playerID, activeGlow }) => {
  const tableRef = React.useRef<HTMLDivElement | null>(null);
  const centerRef = React.useRef<HTMLDivElement | null>(null);
  const [tableSize, setTableSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [centerSize, setCenterSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  useLayoutEffect(() => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    const ro = new ResizeObserver(() => {
      setTableSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setTableSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!centerRef.current) return;
    const el = centerRef.current;
    const ro = new ResizeObserver(() => {
      setCenterSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setCenterSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const orderedEntries = (players: UnoGameState["players"]) =>
    Object.entries(players).sort(
      ([a], [b]) => Number.parseInt(a, 10) - Number.parseInt(b, 10)
    );

  const opponents = useMemo(() => {
    const entries = orderedEntries(state.players);
    const playerIndex = entries.findIndex(([pid]) => pid === playerID);

    const rotated = [
      ...entries.slice(playerIndex + 1),
      ...entries.slice(0, playerIndex),
    ];

    return rotated;
  }, [state.players, playerID]);

  const layout = useMemo(() => {
    const n = opponents.length;
    if (n === 0)
      return {
        seats: [] as Array<{
          pid: string;
          p: any;
          x: number;
          y: number;
          ang: number;
        }>,
        r: 0,
        span: 0,
        seatScale: 1,
      };

    const seatBaseW = 220;
    const seatBaseH = 92;
    const seatHalfDiagBase = 0.5 * Math.hypot(seatBaseW, seatBaseH);

    const margin = 16;
    const halfW = Math.max(1, tableSize.w / 2);
    const halfH = Math.max(1, tableSize.h / 2);

    const minScale = 0.78;
    const maxScale = 1;
    const minW = 760;
    const maxW = 1200;
    const w = tableSize.w || maxW;
    const linearScale =
      w >= maxW
        ? maxScale
        : w <= minW
        ? minScale
        : minScale + ((w - minW) / (maxW - minW)) * (maxScale - minScale);

    const cW = centerSize.w || 220;
    const cH = centerSize.h || 160;
    const centerHalfDiag = 0.5 * Math.hypot(cW, cH);

    const denomX = seatBaseW / 2 + seatHalfDiagBase;
    const denomY = seatBaseH / 2 + seatHalfDiagBase;
    const sAllowX =
      (halfW - margin - 12 - centerHalfDiag) / Math.max(1, denomX);
    const sAllowY =
      (halfH - margin - 12 - centerHalfDiag) / Math.max(1, denomY);
    const sFromBounds = Math.min(1, sAllowX, sAllowY);
    const seatScale = Math.max(
      minScale,
      Math.min(linearScale, sFromBounds, maxScale)
    );

    const effSeatW = seatBaseW * seatScale;
    const effSeatH = seatBaseH * seatScale;
    const effSeatHalfDiag = seatHalfDiagBase * seatScale;

    const rMax = Math.max(
      140,
      Math.min(halfW - effSeatW / 2 - margin, halfH - effSeatH / 2 - margin)
    );
    const rMin = centerHalfDiag + effSeatHalfDiag + 12;

    const desiredR = 320 + Math.max(0, 4 - n) * 40;
    let r = Math.min(rMax, Math.max(desiredR, rMin));

    const baseSpan =
      n <= 1
        ? 0
        : n === 2
        ? 110
        : n === 3
        ? 130
        : n === 4
        ? 145
        : n <= 6
        ? 160
        : 170;
    const maxSpan = 188;

    const minGap = 14;
    const targetChord = effSeatW + minGap;
    let finalSpan = baseSpan;
    if (n > 1) {
      const deltaBase = (baseSpan / (n - 1)) * (Math.PI / 180);
      const chordAtBase = 2 * r * Math.sin(deltaBase / 2);
      if (chordAtBase < targetChord) {
        const reqDelta = Math.min(
          Math.PI,
          2 * Math.asin(Math.min(0.999, targetChord / (2 * Math.max(1, r))))
        );
        const reqSpanDeg = ((reqDelta * 180) / Math.PI) * (n - 1);
        finalSpan = Math.min(maxSpan, Math.max(baseSpan, reqSpanDeg));
      }
    }

    const angles = Array.from({ length: n }, (_, i) =>
      n > 1 ? -90 - finalSpan / 2 + (i * finalSpan) / (n - 1) : -90
    );
    const seats = opponents.map(([pid, p], i) => {
      const a = (angles[i] * Math.PI) / 180;
      return { pid, p, x: Math.cos(a) * r, y: Math.sin(a) * r, ang: angles[i] };
    });

    return { seats, r, span: finalSpan, seatScale };
  }, [opponents, tableSize.w, tableSize.h, centerSize.w, centerSize.h]);

  return (
    <div
      ref={tableRef}
      className="relative h-[520px] rounded-xl bg-gradient-to-b from-sky-50 to-white border border-sky-100 overflow-hidden"
    >
      <div
        ref={centerRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <CenterPiles state={state} activeGlow={activeGlow} compact={true} />
      </div>

      {layout.r > 0 && (
        <svg
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          width={(layout.r + 34) * 2}
          height={(layout.r + 34) * 2}
          viewBox={`0 0 ${(layout.r + 34) * 2} ${(layout.r + 34) * 2}`}
          aria-hidden
        >
          <defs>
            <linearGradient id="rt-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <circle
            cx={layout.r + 34}
            cy={layout.r + 34}
            r={layout.r + 18}
            fill="none"
            stroke="url(#rt-ring)"
            strokeWidth="3"
            strokeDasharray="6 10"
            opacity="0.7"
          />
        </svg>
      )}

      {layout.seats.map(({ pid, p, x, y }) => {
        const isTurn = pid === state.currentPlayer;
        const isHuman = !p.isBot;
        const showUno = p.hand?.length === 1;
        return (
          <div
            key={pid}
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
            }}
          >
            <div
              className={`rounded-xl border bg-gradient-to-br from-white/95 to-sky-50/70 p-3 shadow-sm backdrop-blur-sm transition-all ${
                isTurn ? "ring-2 ring-amber-400" : ""
              }`}
              style={{
                width: `${220 * (layout.seatScale ?? 1)}px`,
                ...(isTurn
                  ? {
                      boxShadow: `0 0 0 3px ${activeGlow}55, 0 0 24px ${activeGlow}55`,
                      animation: "pulseRing 1.7s ease-out infinite",
                    }
                  : undefined),
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isHuman && (
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow ring-2 ring-white" />
                )}
                <Avatar
                  name={p.username}
                  src={avatarFor(p.userId, p.username, p.avatarUrl)}
                  size={30}
                />
                <div className="font-medium flex items-center gap-2 min-w-0">
                  <span className="truncate">{p.username}</span>
                  {p.isBot && <span className="text-xs text-sky-600">BOT</span>}
                  {showUno && (
                    <span className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-600">
                      UNO
                    </span>
                  )}
                  {isTurn && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">
                      TURN
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                <MiniDeck />
                <span>{p.hand.length} cards</span>
              </div>
            </div>

            {isTurn && (
              <div className="mx-auto mt-1 w-0 h-0 border-l-8 border-r-8 border-b-[12px] border-l-transparent border-r-transparent border-b-amber-400/70" />
            )}
          </div>
        );
      })}
    </div>
  );
};

const OpponentTile: React.FC<{
  p: {
    username: string;
    userId: string;
    isBot: boolean;
    hand: UnoCard[];
    avatarUrl?: string;
  };
  isTurn: boolean;
  activeGlow: string;
}> = ({ p, isTurn, activeGlow }) => {
  const isHuman = !p.isBot;
  const showUno = p.hand?.length === 1;
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br from-white to-sky-50/70 p-3 sm:p-4 ${
        isTurn ? "ring-2 ring-amber-400" : ""
      }`}
      style={
        isTurn
          ? {
              boxShadow: `0 0 0 3px ${activeGlow}55, 0 0 24px ${activeGlow}55`,
              animation: "pulseRing 1.7s ease-out infinite",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        {isHuman && (
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow ring-2 ring-white" />
        )}
        <Avatar
          name={p.username}
          src={avatarFor(p.userId, p.username, p.avatarUrl)}
          size={28}
        />
        <div className="font-medium flex items-center gap-2">
          <span>{p.username}</span>
          {p.isBot && <span className="text-xs text-sky-600">BOT</span>}
          {showUno && (
            <span className="px-1 py-0.5 rounded text-[10px] bg-red-100 text-red-600">
              UNO
            </span>
          )}
          {isTurn && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">
              TURN
            </span>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
        <MiniDeck />
        <span>{p.hand.length} cards</span>
      </div>
    </div>
  );
};

const MiniDeck: React.FC = () => (
  <div className="relative w-6 h-4">
    <span className="absolute -left-1 top-0 w-4 h-3 bg-slate-700 rounded-sm border border-white/50" />
    <span className="absolute left-0 top-0 w-4 h-3 bg-slate-600 rounded-sm border border-white/50" />
    <span className="absolute left-1 top-0 w-4 h-3 bg-slate-500 rounded-sm border border-white/50" />
  </div>
);

const SeasonalOverlay: React.FC<{
  season: "winter" | "summer" | "fall" | "spring";
}> = ({ season }) => {
  if (season === "winter") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-white/70"
            style={{
              left: `${(i * 37) % 100}%`,
              animation: `slowMove ${8 + (i % 6)}s linear ${i * 0.7}s infinite`,
              top: `${-10 - (i % 20)}%`,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))",
            }}
          >
            ❄️
          </div>
        ))}
      </div>
    );
  }
  if (season === "fall") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-amber-600/70"
            style={{
              left: `${(i * 53) % 100}%`,

              animation: `slowMove ${8 + (i % 6)}s linear ${i * 0.7}s infinite`,
              top: `${-10 - (i % 20)}%`,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))",
            }}
          >
            🍂
          </div>
        ))}
      </div>
    );
  }
  if (season === "summer") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-red-600/70"
            style={{
              left: `${(i * 37) % 100}%`,
              animation: `slowMove ${8 + (i % 6)}s linear ${i * 0.7}s infinite`,
              top: `${-10 - (i % 20)}%`,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))",
            }}
          >
            ☀️
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default UnoGame;

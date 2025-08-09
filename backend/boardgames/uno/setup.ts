import { Game, Ctx } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";

export type UnoColor = "red" | "blue" | "green" | "yellow" | "wild";
export type UnoValue =
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

export type UnoType = "number" | "action" | "wild";

export interface UnoCard {
  color: UnoColor;
  value: UnoValue;
  type: UnoType;
}

export interface UnoPlayerState {
  hand: UnoCard[];
  hasCalledUno: boolean;
  userId: string;
  isBot: boolean;
  username: string;
  avatarUrl?: string;
}

export interface UnoGameState {
  deck: UnoCard[];
  discardPile: UnoCard[];
  players: Record<string, UnoPlayerState>;
  currentPlayer: string;
  direction: 1 | -1;
  currentColor: Exclude<UnoColor, "wild">;
  drawCount: number;
  gamePhase: "playing" | "finished";
  winner: string | null;
  lastPlayedCard: UnoCard;
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
}

export interface CreateStateInput {
  players: Array<{
    userId: string;
    username: string;
    isBot?: boolean;
    avatarUrl?: string;
  }>;
  turnTimeLimitSec: number;
}

const COLORS: Exclude<UnoColor, "wild">[] = ["red", "blue", "green", "yellow"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function card(color: UnoColor, value: UnoValue): UnoCard {
  let type: UnoType = "number";
  if (value === "skip" || value === "reverse" || value === "draw2")
    type = "action";
  if (value === "wild" || value === "wildDraw4") type = "wild";
  return { color, value, type };
}

export function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const c of COLORS) {
    deck.push(card(c, "0"));
    for (const v of [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "skip",
      "reverse",
      "draw2",
    ] as UnoValue[]) {
      deck.push(card(c, v));
      deck.push(card(c, v));
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(card("wild", "wild"));
    deck.push(card("wild", "wildDraw4"));
  }
  return shuffle(deck);
}

export function drawFromDeck(state: UnoGameState, n: number): UnoCard[] {
  const drawn: UnoCard[] = [];
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      const top = state.discardPile[state.discardPile.length - 1];
      const pool = shuffle(state.discardPile.slice(0, -1));
      state.deck = pool;
      state.discardPile = [top];
    }
    if (state.deck.length === 0) break;
    drawn.push(state.deck.pop() as UnoCard);
  }
  return drawn;
}

function isFinished(state: UnoGameState, pid: string): boolean {
  return (
    state.finishedOrder.includes(pid) || state.players[pid]?.hand.length === 0
  );
}

export function nextPlayerId(state: UnoGameState, steps = 1): string {
  const ids = Object.keys(state.players).sort((a, b) => Number(a) - Number(b));
  const n = ids.length;
  if (n === 0) return "0";
  let idx = ids.indexOf(state.currentPlayer);
  let advanced = 0;

  while (advanced < steps) {
    idx = (idx + (state.direction === 1 ? 1 : -1) + n) % n;
    let guard = 0;
    while (isFinished(state, ids[idx]) && guard < n) {
      idx = (idx + (state.direction === 1 ? 1 : -1) + n) % n;
      guard++;
    }
    advanced++;
  }
  return ids[idx];
}

export function canPlayCard(
  state: UnoGameState,
  playerID: string,
  cardToPlay: UnoCard
): boolean {
  const top = state.lastPlayedCard;

  if (cardToPlay.value === "wild") return true;

  if (cardToPlay.value === "wildDraw4") {
    const hand = state.players[playerID]?.hand ?? [];
    const hasMatchingColor = hand.some(
      (c) => c.color !== "wild" && c.color === state.currentColor
    );
    return !hasMatchingColor;
  }

  if (cardToPlay.color === state.currentColor) return true;
  if (cardToPlay.value === top.value) return true;

  return false;
}

export function applyCardEffects(
  state: UnoGameState,
  played: UnoCard,
  chosenColor?: Exclude<UnoColor, "wild">
) {
  if (played.type === "wild") {
    state.currentColor = chosenColor || state.currentColor;
  } else {
    state.currentColor = played.color as Exclude<UnoColor, "wild">;
  }

  if (played.value === "reverse") {
    if (Object.keys(state.players).length > 2) {
      state.direction = state.direction === 1 ? -1 : 1;
    } else {
      state.skipNextPlayer = true;
    }
  } else if (played.value === "skip") {
    state.skipNextPlayer = true;
  }
}

export function createInitialState(input: CreateStateInput): UnoGameState {
  const deck = buildDeck();
  const players: Record<string, UnoPlayerState> = {};
  input.players.forEach((p, idx) => {
    players[String(idx)] = {
      hand: [],
      hasCalledUno: false,
      userId: p.userId,
      isBot: !!p.isBot,
      username: p.username,
      avatarUrl: p.avatarUrl,
    };
  });

  for (let i = 0; i < 7; i++) {
    for (const pid of Object.keys(players)) {
      const c = deck.pop() as UnoCard;
      players[pid].hand.push(c);
    }
  }

  let starter: UnoCard | undefined;
  while (deck.length && !starter) {
    const c = deck.pop() as UnoCard;
    if (c.type === "wild") {
      deck.unshift(c);
    } else {
      starter = c;
    }
  }
  const lastPlayedCard = starter || card("red", "1");
  const currentColor = (
    lastPlayedCard.color === "wild" ? "red" : lastPlayedCard.color
  ) as Exclude<UnoColor, "wild">;

  return {
    deck,
    discardPile: [lastPlayedCard],
    players,
    currentPlayer: "0",
    direction: 1,
    currentColor,
    drawCount: 0,
    gamePhase: "playing",
    winner: null,
    lastPlayedCard,
    skipNextPlayer: false,
    turnTimeLimit: input.turnTimeLimitSec * 1000,
    turnStartTime: Date.now(),
    gameLog: [],
    finishedOrder: [],
  };
}

function handleFinishAndMaybeEnd(
  state: UnoGameState,
  finishingPlayer: string
): boolean {
  if (!state.finishedOrder.includes(finishingPlayer)) {
    state.finishedOrder.push(finishingPlayer);
  }
  const remaining = Object.keys(state.players).filter(
    (pid) => !state.finishedOrder.includes(pid)
  );
  if (remaining.length <= 1) {
    if (remaining.length === 1 && !state.finishedOrder.includes(remaining[0])) {
      state.finishedOrder.push(remaining[0]);
    }
    state.gamePhase = "finished";
    state.winner = state.finishedOrder[0] ?? finishingPlayer;
    return true;
  }
  return false;
}

export function playCardMove(
  state: UnoGameState,
  playerID: string,
  cardIndex: number,
  chosenColor?: Exclude<UnoColor, "wild">
) {
  if (state.gamePhase !== "playing") return { error: "Game finished" };
  if (playerID !== state.currentPlayer) return { error: "Not your turn" };

  const me = state.players[playerID];
  if (!me) return { error: "Player not found" };
  const cardToPlay = me.hand[cardIndex];
  if (!cardToPlay) return { error: "Invalid card index" };

  if (cardToPlay.type === "wild" && !chosenColor) {
    return { error: "Choose a color for wild card" };
  }
  if (!canPlayCard(state, playerID, cardToPlay)) {
    return { error: "Card not playable on current top card/color" };
  }

  me.hand.splice(cardIndex, 1);
  state.discardPile.push(cardToPlay);
  state.lastPlayedCard = cardToPlay;

  applyCardEffects(state, cardToPlay, chosenColor);

  state.gameLog.push({
    playerId: playerID,
    action: "play",
    card: cardToPlay,
    timestamp: Date.now(),
  });

  if (me.hand.length === 0) {
    const ended = handleFinishAndMaybeEnd(state, playerID);
    if (ended) {
      return { ok: true, finished: true };
    }
  }

  if (cardToPlay.value === "draw2" || cardToPlay.value === "wildDraw4") {
    const penalty = cardToPlay.value === "draw2" ? 2 : 4;
    const target = nextPlayerId(state, 1);
    const targetP = state.players[target];
    if (targetP) {
      const drawn = drawFromDeck(state, penalty);
      targetP.hand.push(...drawn);
      state.gameLog.push({
        playerId: target,
        action: cardToPlay.value === "draw2" ? "drawPenalty2" : "drawPenalty4",
        timestamp: Date.now(),
      });
    }
    state.skipNextPlayer = false;
    state.currentPlayer = nextPlayerId(state, 2);
  } else {
    let steps = 1;
    if (state.skipNextPlayer) {
      steps = 2;
      state.skipNextPlayer = false;
    }
    state.currentPlayer = nextPlayerId(state, steps);
  }

  state.turnStartTime = Date.now();
  return { ok: true };
}

export function drawCardMove(state: UnoGameState, playerID: string) {
  if (state.gamePhase !== "playing") return { error: "Game finished" };
  if (playerID !== state.currentPlayer) return { error: "Not your turn" };
  const me = state.players[playerID];
  if (!me) return { error: "Player not found" };

  const cards = drawFromDeck(state, 1);
  me.hand.push(...cards);

  state.turnStartTime = Date.now();
  state.gameLog.push({
    playerId: playerID,
    action: "draw",
    timestamp: Date.now(),
  });

  state.currentPlayer = nextPlayerId(state, 1);
  return { ok: true };
}

export function callUnoMove(state: UnoGameState, playerID: string) {
  const me = state.players[playerID];
  if (!me) return { error: "Player not found" };
  me.hasCalledUno = true;
  state.gameLog.push({
    playerId: playerID,
    action: "call-uno",
    timestamp: Date.now(),
  });
  return { ok: true };
}

function drawCards(state: UnoGameState, playerID: string, n: number): boolean {
  const player = state.players[playerID];
  if (!player) return false;
  const cards = drawFromDeck(state, n);
  if (cards.length === 0) return false;
  player.hand.push(...cards);
  return true;
}

export const UnoGame: Game<UnoGameState> = {
  name: "uno",

  setup: (
    context: Record<string, unknown> & { ctx: Ctx },
    setupData?: any
  ): UnoGameState => {
    try {
      const ctx = context.ctx;
      if (!ctx.numPlayers || ctx.numPlayers < 2 || ctx.numPlayers > 8) {
        throw new Error("Invalid number of players");
      }

      const deck = buildDeck();
      function dealInitialHands(
        deck: UnoCard[],
        numPlayers: number
      ): { hands: UnoCard[][]; remainingDeck: UnoCard[] } {
        const hands: UnoCard[][] = Array.from({ length: numPlayers }, () => []);
        const deckCopy = [...deck];
        for (let i = 0; i < 7; i++) {
          for (let p = 0; p < numPlayers; p++) {
            hands[p].push(deckCopy.pop() as UnoCard);
          }
        }
        return { hands, remainingDeck: deckCopy };
      }
      const { hands, remainingDeck } = dealInitialHands(deck, ctx.numPlayers);

      let initialCardIndex = 0;
      while (
        initialCardIndex < remainingDeck.length &&
        (remainingDeck[initialCardIndex].color === "wild" ||
          remainingDeck[initialCardIndex].type === "action")
      ) {
        initialCardIndex++;
      }

      if (initialCardIndex >= remainingDeck.length) {
        initialCardIndex = remainingDeck.findIndex(
          (card) => card.color !== "wild"
        );
        if (initialCardIndex === -1) {
          throw new Error("No suitable starting card found");
        }
      }

      const initialCard = remainingDeck[initialCardIndex];
      const finalDeck = remainingDeck.filter(
        (_, index) => index !== initialCardIndex
      );

      const players: UnoGameState["players"] = {};

      const playerData = setupData?.players || [];

      for (let i = 0; i < ctx.numPlayers; i++) {
        const playerInfo = playerData[i];
        players[i.toString()] = {
          hand: hands[i],
          hasCalledUno: false,
          userId: playerInfo?.userId || `player_${i}`,
          isBot: playerInfo?.isBot || false,
          username: playerInfo?.username || `Player ${i + 1}`,
        };
      }

      return {
        deck: finalDeck,
        discardPile: [initialCard],
        players,
        currentPlayer: "0",
        direction: 1,
        currentColor: initialCard.color as "red" | "blue" | "green" | "yellow",
        drawCount: 0,
        gamePhase: "playing",
        winner: null,
        lastPlayedCard: initialCard,
        skipNextPlayer: false,
        turnTimeLimit: 30000,
        turnStartTime: Date.now(),
        gameLog: [
          {
            playerId: "system",
            action: "gameStart",
            card: initialCard,
            timestamp: Date.now(),
          },
        ],
        finishedOrder: [],
      };
    } catch (error) {
      console.error("Game setup error:", error);
      throw error;
    }
  },

  turn: {
    onBegin: ({
      G,
      ctx,
      events,
    }: {
      G: UnoGameState;
      ctx: Ctx;
      events: any;
    }) => {
      G.turnStartTime = Date.now();

      if (G.players[ctx.currentPlayer]?.isBot) {
        const botMove = getBotMove(G, ctx.currentPlayer);

        if (botMove.action === "playCard" && botMove.cardIndex !== undefined) {
          const cardToPlay =
            G.players[ctx.currentPlayer].hand[botMove.cardIndex];

          const moves = UnoGame.moves as any;
          const result = moves.playCard(
            { G, ctx, events },
            botMove.cardIndex,
            botMove.color
          );

          if (result !== INVALID_MOVE) {
            G.gameLog.push({
              playerId: ctx.currentPlayer,
              action: "playCard",
              card: cardToPlay,
              timestamp: Date.now(),
            });
          }
        } else {
          const moves = UnoGame.moves as any;
          moves.drawCard({ G, ctx, events });

          G.gameLog.push({
            playerId: ctx.currentPlayer,
            action: "drawCard",
            timestamp: Date.now(),
          });
        }

        events?.endTurn();
      }

      function getBotMove(
        state: UnoGameState,
        playerID: string
      ):
        | {
            action: "playCard";
            cardIndex: number;
            color?: Exclude<UnoColor, "wild">;
          }
        | { action: "drawCard" } {
        const player = state.players[playerID];
        if (!player) return { action: "drawCard" };

        for (let i = 0; i < player.hand.length; i++) {
          const c = player.hand[i];
          if (canPlayCard(state, playerID, c)) {
            if (c.type === "wild") {
              const colorCounts: Record<Exclude<UnoColor, "wild">, number> = {
                red: 0,
                blue: 0,
                green: 0,
                yellow: 0,
              };
              for (const card of player.hand) {
                if (card.color !== "wild") colorCounts[card.color]++;
              }
              const bestColor =
                (Object.entries(colorCounts).sort(
                  (a, b) => b[1] - a[1]
                )[0][0] as Exclude<UnoColor, "wild">) || "red";
              return { action: "playCard", cardIndex: i, color: bestColor };
            }
            return { action: "playCard", cardIndex: i };
          }
        }
        return { action: "drawCard" };
      }
    },

    onEnd: ({ G, ctx }: { G: UnoGameState; ctx: Ctx }) => {
      let nextPlayer = ctx.currentPlayer;

      if (G.skipNextPlayer) {
        nextPlayer = nextPlayerId(G, 2);
        G.skipNextPlayer = false;
      } else {
        nextPlayer = nextPlayerId(G, 1);
      }
      G.currentPlayer = nextPlayer;
    },
  },

  moves: {
    playCard: (
      { G, ctx, events }: { G: UnoGameState; ctx: Ctx; events: any },
      cardIndex: number,
      chosenColor?: "red" | "blue" | "green" | "yellow"
    ) => {
      try {
        const player = G.players[ctx.currentPlayer];
        if (!player || cardIndex < 0 || cardIndex >= player.hand.length) {
          return INVALID_MOVE;
        }

        const card = player.hand[cardIndex];
        const topCard = G.discardPile[G.discardPile.length - 1];

        if (!canPlayCard(G, ctx.currentPlayer, card)) {
          return INVALID_MOVE;
        }

        if (G.drawCount > 0) {
          const canStack =
            (card.value === "draw2" && topCard.value === "draw2") ||
            (card.value === "wildDraw4" && topCard.value === "wildDraw4");
          if (!canStack) {
            return INVALID_MOVE;
          }
        }

        player.hand.splice(cardIndex, 1);

        G.discardPile.push(card);
        G.lastPlayedCard = card;

        if (card.color === "wild") {
          if (!chosenColor) return INVALID_MOVE;
          G.currentColor = chosenColor;
        } else {
          G.currentColor = card.color;
        }

        switch (card.value) {
          case "skip":
            G.skipNextPlayer = true;
            break;
          case "reverse":
            G.direction *= -1;
            if (ctx.numPlayers === 2) {
              G.skipNextPlayer = true;
            }
            break;
          case "draw2":
            G.drawCount += 2;
            G.skipNextPlayer = true;
            break;
          case "wildDraw4":
            G.drawCount += 4;
            G.skipNextPlayer = true;
            break;
        }

        if (player.hand.length === 0) {
          G.winner = ctx.currentPlayer;
          G.gamePhase = "finished";
          events?.endGame();
          return;
        }

        if (player.hand.length === 1) {
          player.hasCalledUno = true;
        }

        Object.keys(G.players).forEach((playerId) => {
          if (
            playerId !== ctx.currentPlayer &&
            G.players[playerId].hand.length !== 1
          ) {
            G.players[playerId].hasCalledUno = false;
          }
        });

        G.gameLog.push({
          playerId: ctx.currentPlayer,
          action: "playCard",
          card,
          timestamp: Date.now(),
        });

        events?.endTurn();
      } catch (error) {
        console.error("Play card error:", error);
        return INVALID_MOVE;
      }
    },

    drawCard: ({
      G,
      ctx,
      events,
    }: {
      G: UnoGameState;
      ctx: Ctx;
      events: any;
    }) => {
      try {
        const player = G.players[ctx.currentPlayer];
        if (!player) return INVALID_MOVE;

        if (G.drawCount > 0) {
          const success = drawCards(G, ctx.currentPlayer, G.drawCount);
          if (!success) return INVALID_MOVE;

          G.drawCount = 0;
          G.gameLog.push({
            playerId: ctx.currentPlayer,
            action: "drawPenalty",
            timestamp: Date.now(),
          });
        } else {
          const success = drawCards(G, ctx.currentPlayer, 1);
          if (!success) return INVALID_MOVE;

          G.gameLog.push({
            playerId: ctx.currentPlayer,
            action: "drawCard",
            timestamp: Date.now(),
          });
        }

        events?.endTurn();
      } catch (error) {
        console.error("Draw card error:", error);
        return INVALID_MOVE;
      }
    },

    callUno: ({ G, ctx }: { G: UnoGameState; ctx: Ctx }) => {
      try {
        const player = G.players[ctx.currentPlayer];
        if (!player || player.hand.length !== 1) {
          return INVALID_MOVE;
        }

        player.hasCalledUno = true;
        G.gameLog.push({
          playerId: ctx.currentPlayer,
          action: "callUno",
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Call Uno error:", error);
        return INVALID_MOVE;
      }
    },

    challengeUno: (
      { G, ctx }: { G: UnoGameState; ctx: Ctx },
      targetPlayerId: string
    ) => {
      try {
        const targetPlayer = G.players[targetPlayerId];
        const challenger = G.players[ctx.currentPlayer];

        if (!targetPlayer || !challenger) {
          return INVALID_MOVE;
        }

        if (targetPlayer.hand.length === 1 && !targetPlayer.hasCalledUno) {
          drawCards(G, targetPlayerId, 2);
          targetPlayer.hasCalledUno = true;

          G.gameLog.push({
            playerId: ctx.currentPlayer,
            action: "challengeUnoSuccess",
            timestamp: Date.now(),
          });
        } else {
          drawCards(G, ctx.currentPlayer, 2);

          G.gameLog.push({
            playerId: ctx.currentPlayer,
            action: "challengeUnoFailed",
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Challenge Uno error:", error);
        return INVALID_MOVE;
      }
    },
  },

  endIf: ({ G }: { G: UnoGameState }) => {
    if (G.gamePhase === "finished") {
      return { winner: G.winner };
    }

    const currentTime = Date.now();
    if (currentTime - G.turnStartTime > G.turnTimeLimit) {
      const player = G.players[G.currentPlayer];
      if (player && !player.isBot) {
        drawCards(G, G.currentPlayer, 1);
      }
    }

    return undefined;
  },

  onEnd: ({ G }: { G: UnoGameState }) => {
    try {
      const scores: { [playerId: string]: number } = {};
      let totalScore = 0;

      Object.keys(G.players).forEach((playerId) => {
        const hand = G.players[playerId].hand;
        const playerScore = hand.reduce((score, card) => {
          if (card.type === "number") return score + Number(card.value);
          if (card.type === "action") return score + 20;
          if (card.type === "wild") return score + 50;
          return score;
        }, 0);

        scores[playerId] = playerScore;
        totalScore += playerScore;
      });

      if (G.winner) {
        scores[G.winner] = totalScore;
      }

      console.log("Final scores:", scores);
      console.log("Game log:", G.gameLog);
      console.log("Winner:", G.winner);
    } catch (error) {
      console.error("Game end error:", error);
    }
  },
};

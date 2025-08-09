import z from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc/init";
import { authRouter } from "./auth";
import { userRouter } from "./user";
import { microCircleRouter } from "./microCircle";
import { connectionRouter } from "./connection";
import { moodRouter } from "./mood";
import { conversationRouter } from "./conversation";
import { boardgamesRouter } from "./boardgame";
import { notesRouter } from "./notes";
import { trackerRouter } from "./track";

export const appRouter = createTRPCRouter({
  sampleProcedure: publicProcedure.query(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { message: "Hello from the backend!", status: "OK" };
  }),

  sampleWithInput: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(async (opts) => {
      const { input } = opts;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { message: `Hello ${input.text}`, status: "OK" };
    }),

  sampleProtectedRoute: protectedProcedure.query(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return { message: "You called a Protected Procedure!", status: "OK" };
  }),

  auth: authRouter,
  user: userRouter,
  connection: connectionRouter,
  microCircle: microCircleRouter,
  mood: moodRouter,
  conversation: conversationRouter,
  boardgame: boardgamesRouter,
  notes: notesRouter,
  tracker: trackerRouter,
});

export type AppRouter = typeof appRouter;

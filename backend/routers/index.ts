import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc/init";


export const appRouter = createTRPCRouter({
    sampleProcedure: publicProcedure.query(async()=>{
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { message: "Hello from the backend!",status: "OK" };
    }),

    sampleWithInput: publicProcedure.input(z.object({
        text: z.string(),
    })).query(async(opts)=>{
        const { input } = opts;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { message: `Hello ${input.text}`,status: "OK" };
    }),

    sampleProtectedRoute: protectedProcedure.query(async()=>{
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { message: "You called a Protected Procedure!",status: "OK" };
    }),
});

export type AppRouter = typeof appRouter;
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import dbConnect from "../lib/mongo";
import { getUserfromSession } from "../auth/session";

class SessionCache {
  private _cache = new Map<string, any>();
  private _lastCleanup = Date.now();
  private _cleanupInterval = 24 * 60 * 60 * 1000;

  async get(sessionCookie: string) {
    if (!sessionCookie) {
      return undefined;
    }

    const now = Date.now();
    if (now - this._lastCleanup > this._cleanupInterval) {
      this._cache.clear();
      this._lastCleanup = now;
      console.log("Session cache cleared for memory management");
    }

    if (this._cache.has(sessionCookie)) {
      return this._cache.get(sessionCookie) || undefined;
    }

    if (this._cache.size > 1000) {
      this._cache.clear();
      console.log("Session cache cleared due to size limit");
    }

    try {
      console.log("Cache miss - fetching fresh session");
      const session = await getUserfromSession();

      this._cache.set(sessionCookie, session || false);

      return session || undefined;
    } catch (error) {
      console.error("Error fetching session:", error);
      return undefined;
    }
  }
}

const sessionCache = new SessionCache();

export const createContext = async (opts: { req: any; res: any }) => {
  const db = await dbConnect();

  return {
    db,
    req: opts.req,
    res: opts.res,
    sessionFactory: {
      async get() {
        const sessionCookie =
          opts.req.cookies?.get("connect_friends_session")?.value ||
          opts.req.headers?.cookie?.match(
            /connect_friends_session=([^;]+)/
          )?.[1];

        return await sessionCache.get(sessionCookie);
      },
    },
  };
};

const t = initTRPC.context<typeof createContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;
  const session = await ctx.sessionFactory.get();
  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({
    ctx: {
      ...ctx,
      session,
      user: { ...session },
    },
  });
});

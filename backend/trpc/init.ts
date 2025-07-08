import { initTRPC , TRPCError} from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import dbConnect from '../lib/mongo';
import { getUserfromSession } from '../auth/session';


export const createContext = async () => {
  const db = await dbConnect();
  const authenticatedUser = await getUserfromSession();
 
  return {
    db,
    session: authenticatedUser,
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
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
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
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next({
    ctx: {
      user: {...ctx.session },
    },
  });
});
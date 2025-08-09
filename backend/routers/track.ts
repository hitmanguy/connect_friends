import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import { TrackerModel } from "../model/track";

const dayZ = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const RETENTION_DAYS = 1;

const baseTaskZ = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  day: dayZ,
  startMin: z.number().min(0).max(1440),
  endMin: z.number().min(0).max(1440),
  category: z.enum(["work", "personal", "break", "custom"]).default("work"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const patchZ = baseTaskZ
  .partial()
  .refine((p) => Object.keys(p).length > 0, "No changes")
  .refine(
    (p) => !(p.startMin != null && p.endMin != null && p.endMin < p.startMin),
    "endMin must be >= startMin"
  );

function endOfLocalDay(day: string): Date {
  const [y, m, d] = day.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (!Number.isFinite(dt.getTime()))
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid day" });
  return dt;
}
function expiryFor(day: string): Date {
  const dt = endOfLocalDay(day);
  if (RETENTION_DAYS > 0) dt.setDate(dt.getDate() + RETENTION_DAYS);
  return dt;
}
function todayKey() {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}

export const trackerRouter = createTRPCRouter({
  listDay: protectedProcedure
    .input(z.object({ day: dayZ }))
    .query(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const tasks = await TrackerModel.find({ userId: uid, day: input.day })
        .sort({ startMin: 1 })
        .lean();
      return { tasks };
    }),

  create: protectedProcedure
    .input(baseTaskZ)
    .mutation(async ({ input, ctx }) => {
      if (input.endMin < input.startMin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "endMin must be >= startMin",
        });
      }
      const uid = ctx.user._id.toString();
      const doc = await TrackerModel.create({
        userId: uid,
        ...input,
        tags: input.tags ?? [],
        expiresAt: expiryFor(input.day),
      });
      return { task: doc.toObject() };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), patch: patchZ }))
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const patch: any = { ...input.patch };
      if (patch.day) {
        patch.expiresAt = expiryFor(patch.day);
      }
      const doc = await TrackerModel.findOneAndUpdate(
        { _id: input.id, userId: uid },
        { $set: patch },
        { new: true }
      ).lean();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return { task: doc };
    }),

  toggleDone: protectedProcedure
    .input(z.object({ id: z.string(), done: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const existing = await TrackerModel.findOne({
        _id: input.id,
        userId: uid,
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const next = input.done ?? !existing.done;
      existing.done = next;
      await existing.save();
      return { task: existing.toObject() };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const res = await TrackerModel.deleteOne({ _id: input.id, userId: uid });
      if (!res.deletedCount) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true };
    }),

  purgeOld: protectedProcedure
    .input(z.object({ beforeDay: dayZ }).optional())
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const cutoff = input?.beforeDay ?? todayKey();
      const res = await TrackerModel.deleteMany({
        userId: uid,
        day: { $lt: cutoff },
      });
      return { deleted: res.deletedCount ?? 0, cutoff };
    }),
});

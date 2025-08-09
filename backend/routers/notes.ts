import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import { NoteModel } from "../model/note";

const dayRx = /^\d{4}-\d{2}-\d{2}$/;

const pointZ = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
const strokeZ = z.object({ points: z.array(pointZ).min(1) });

const createZ = z
  .object({
    day: z.string().regex(dayRx).optional(),
    text: z.string().max(4000).optional().default(""),
    lines: z.array(strokeZ).optional().default([]),
  })
  .refine(
    (v) => (v.text?.trim()?.length ?? 0) > 0 || (v.lines?.length ?? 0) > 0,
    {
      message: "Provide text or drawing",
    }
  );

const patchZ = z
  .object({
    text: z.string().max(4000).optional(),
    lines: z.array(strokeZ).optional(),
    day: z.string().regex(dayRx).optional(),
  })
  .refine((p) => Object.keys(p).length > 0, { message: "No changes" });

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export const notesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          day: z.string().regex(dayRx).optional(),
          all: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const all = !!input?.all;
      const d = input?.day ?? dayKey();
      const filter = all ? { userId: uid } : { userId: uid, day: d };
      const notes = await NoteModel.find(filter).sort({ updatedAt: -1 }).lean();
      return { notes };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const note = await NoteModel.findOne({
        _id: input.id,
        userId: uid,
      }).lean();
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      return { note };
    }),

  create: protectedProcedure.input(createZ).mutation(async ({ input, ctx }) => {
    const uid = ctx.user._id.toString();
    const doc = await NoteModel.create({
      userId: uid,
      day: input.day ?? dayKey(),
      text: input.text ?? "",
      lines: input.lines ?? [],
    });
    return { note: doc.toObject() };
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), patch: patchZ }))
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const doc = await NoteModel.findOneAndUpdate(
        { _id: input.id, userId: uid },
        { $set: input.patch },
        { new: true }
      ).lean();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return { note: doc };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const uid = ctx.user._id.toString();
      const res = await NoteModel.deleteOne({ _id: input.id, userId: uid });
      if (!res.deletedCount) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true };
    }),
});

import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import { z } from "zod";
import { Types } from "mongoose";
import { Conversation } from "../model/conversation";
import { Connection } from "../model/connection";
import { MicroCircle } from "../model/microCircle";
import { User } from "../model/auth";
import { TRPCError } from "@trpc/server";
import { uploadCloudinary } from "../cloudinary/upload";

async function canSendTo(userId: string, targetId: string, isHost: boolean) {
  if (isHost) return true;

  const direct = await Connection.findOne({
    $or: [
      { userA: userId, userB: targetId },
      { userA: targetId, userB: userId },
    ],
    status: "ACTIVE",
  }).lean();

  if (direct) return true;

  const hostDoc = await User.findById(userId, "hostId").lean();
  const hostIdValue = (
    hostDoc as { hostId?: string } | null
  )?.hostId?.toString();
  console.log("Host ID:", hostIdValue);
  if (hostIdValue) {
    if (hostIdValue === targetId) return true;
  }

  const microCircle = await MicroCircle.findOne({
    members: userId,
    _id: targetId,
    isActive: true,
  }).lean();

  if (microCircle) return true;

  return false;
}

export const conversationRouter = createTRPCRouter({
  getMyConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = Types.ObjectId.createFromHexString(ctx.user._id);

    const directConvos = await Conversation.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate("participants", "username profileImage")
      .populate("messages.sender", "username profileImage")
      .lean();

    return directConvos;
  }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        to: z.string(),
        toType: z.enum(["user", "microCircle"]).default("user"),
        content: z.string().optional(),
        attachments: z
          .array(
            z.object({
              fileData: z.string(),
              type: z.enum(["image", "video", "file"]),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const senderId = ctx.user._id;
      const recipientId = input.to;
      const isHost = ctx.user.UserRole === "host";

      if (!(await canSendTo(senderId, recipientId, isHost))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only message your connections or microcircles.",
        });
      }

      let uploadedAttachments: { url: string; type: string }[] = [];
      if (input.attachments && input.attachments.length > 0) {
        for (const att of input.attachments) {
          const result = await uploadCloudinary(
            att.fileData,
            `attachment_${Date.now()}`
          );
          uploadedAttachments.push({ url: result.secure_url, type: att.type });
        }
      }

      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
      });
      if (!conversation) {
        conversation = new Conversation({
          participants: [senderId, recipientId],
          messages: [],
        });
      }

      conversation.messages.push({
        sender: senderId,
        content: input.content,
        attachments: uploadedAttachments,
        createdAt: new Date(),
      });
      conversation.updatedAt = new Date();
      await conversation.save();

      return {
        code: "OK",
        message: "Message sent",
        conversationId: conversation._id,
      };
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = Types.ObjectId.createFromHexString(ctx.user._id);

      const conversation = await Conversation.findById(input.conversationId);
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const isParticipant = conversation.participants.some(
        (p: any) => p.toString() === userId.toString()
      );
      if (!isParticipant) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to delete this conversation",
        });
      }

      await Conversation.findByIdAndDelete(input.conversationId);

      return { code: "OK", message: "Conversation deleted" };
    }),
});

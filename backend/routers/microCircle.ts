// backend/routers/microCircle.ts
import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import { z } from "zod";
import { Types } from "mongoose";
import { MicroCircle } from "../model/microCircle";
import { User, UserType } from "../model/auth";
import { TRPCError } from "@trpc/server";

export const microCircleRouter = createTRPCRouter({
  getMicroCircles: protectedProcedure.query(async ({ ctx }) => {
    try {
      const hostId = Types.ObjectId.createFromHexString(ctx.user._id);

      const circles = await MicroCircle.find({ hostId: hostId, isActive: true })
        .populate<{
          members: (Pick<UserType, "username" | "email" | "profileImage"> & {
            _id: Types.ObjectId;
          })[];
        }>("members", "username email profileImage")
        .lean();

      return {
        code: "OK",
        message: "Micro circles retrieved successfully",
        circles: circles.map((circle) => ({
          _id: circle._id.toString(),
          name: circle.name,
          description: circle.description,
          color: circle.color,
          members: circle.members.map((member) => ({
            _id: member._id.toString(),
            username: member.username || "",
            email: member.email || "",
            profileImage: member.profileImage || "",
          })),
          memberCount: circle.members.length,
          createdAt: circle.createdAt,
        })),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch micro circles",
      });
    }
  }),

  createMicroCircle: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        description: z.string().max(200).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .default("#3b82f6"),
        memberIds: z.array(z.string()).optional().default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);

        const memberObjectIds = input.memberIds.map(
          (id) => new Types.ObjectId(id)
        );
        const validMembers = await User.find({
          _id: { $in: memberObjectIds },
          hostId: hostId,
        });

        if (validMembers.length !== memberObjectIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Some member IDs are invalid or don't belong to this host",
          });
        }

        const circle = new MicroCircle({
          name: input.name,
          description: input.description,
          color: input.color,
          hostId: hostId,
          members: memberObjectIds,
        });

        await circle.save();

        return {
          code: "OK",
          message: "Micro circle created successfully",
          circle: {
            _id: circle._id.toString(),
            name: circle.name,
            description: circle.description,
            color: circle.color,
            memberCount: circle.members.length,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create micro circle",
        });
      }
    }),

  // Add/remove members from micro circle
  updateMicroCircleMembers: protectedProcedure
    .input(
      z.object({
        circleId: z.string(),
        memberIds: z.array(z.string()),
        action: z.enum(["ADD", "REMOVE", "SET"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);
        const circleId = new Types.ObjectId(input.circleId);
        const memberObjectIds = input.memberIds.map(
          (id) => new Types.ObjectId(id)
        );

        const circle = await MicroCircle.findOne({
          _id: circleId,
          hostId: hostId,
          isActive: true,
        });

        if (!circle) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Micro circle not found",
          });
        }

        const validMembers = await User.find({
          _id: { $in: memberObjectIds },
          hostId: hostId,
        });

        if (validMembers.length !== memberObjectIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Some member IDs are invalid",
          });
        }

        switch (input.action) {
          case "ADD":
            circle.members = [
              ...new Set([...circle.members, ...memberObjectIds]),
            ];
            break;
          case "REMOVE":
            circle.members = circle.members.filter(
              (memberId) => !memberObjectIds.some((id) => id.equals(memberId))
            );
            break;
          case "SET":
            circle.members = memberObjectIds;
            break;
        }

        await circle.save();

        return {
          code: "OK",
          message: "Micro circle members updated successfully",
          memberCount: circle.members.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update micro circle members",
        });
      }
    }),
});

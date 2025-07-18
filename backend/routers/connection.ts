// backend/routers/connection.ts
import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import { z } from "zod";
import { Types } from "mongoose";
import { Connection } from "../model/connection";
import { ConnectionLedger } from "../model/connectionLedger";
import { User, UserType } from "../model/auth";
import { TRPCError } from "@trpc/server";
import { MicroCircleType } from "../model/microCircle";

export const connectionRouter = createTRPCRouter({
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const hostId = Types.ObjectId.createFromHexString(ctx.user._id);

      const connections = await Connection.find({ createdBy: hostId })
        .populate<{
          userA: Pick<UserType, "username" | "email" | "profileImage"> & {
            _id: Types.ObjectId;
          };
        }>("userA", "username email profileImage")
        .populate<{
          userB: Pick<UserType, "username" | "email" | "profileImage"> & {
            _id: Types.ObjectId;
          };
        }>("userB", "username email profileImage")
        .populate<{
          microCircleId: Pick<MicroCircleType, "name" | "color"> & {
            _id: Types.ObjectId;
          };
        }>("microCircleId", "_id name color")
        .lean();

      return {
        code: "OK",
        message: "Connections retrieved successfully",
        connections: connections.map((conn) => ({
          _id: conn._id.toString(),
          userA: {
            _id: conn.userA._id.toString(),
            username: conn.userA.username,
            email: conn.userA.email,
            profileImage: conn.userA.profileImage,
          },
          userB: {
            _id: conn.userB._id.toString(),
            username: conn.userB.username,
            email: conn.userB.email,
            profileImage: conn.userB.profileImage,
          },
          microCircle: conn.microCircleId
            ? {
                _id: conn.microCircleId._id.toString(),
                name: conn.microCircleId.name,
                color: conn.microCircleId.color,
              }
            : null,
          status: conn.status,
          notes: conn.notes,
          createdAt: conn.createdAt,
        })),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch connections",
      });
    }
  }),

  createConnection: protectedProcedure
    .input(
      z.object({
        userAId: z.string(),
        userBId: z.string(),
        microCircleId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);
        const userAId = new Types.ObjectId(input.userAId);
        const userBId = new Types.ObjectId(input.userBId);

        // Validate both users exist and belong to this host
        const users = await User.find({
          _id: { $in: [userAId, userBId] },
          hostId: hostId,
        });

        if (users.length !== 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or both users not found or don't belong to this host",
          });
        }

        const existingConnection = await Connection.findOne({
          $or: [
            { userA: userAId, userB: userBId },
            { userA: userBId, userB: userAId },
          ],
        });

        if (existingConnection) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Connection already exists between these users",
          });
        }

        const connection = new Connection({
          userA: userAId,
          userB: userBId,
          createdBy: hostId,
          microCircleId: input.microCircleId
            ? new Types.ObjectId(input.microCircleId)
            : undefined,
          notes: input.notes,
        });

        await connection.save();

        return {
          code: "OK",
          message: "Connection created successfully",
          connection: {
            _id: connection._id.toString(),
            userAId: userAId.toString(),
            userBId: userBId.toString(),
            createdAt: connection.createdAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create connection",
        });
      }
    }),

  deleteConnection: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);
        const connectionId = new Types.ObjectId(input.connectionId);

        const connection = await Connection.findOne({
          _id: connectionId,
          createdBy: hostId,
        });

        if (!connection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection not found",
          });
        }

        await Connection.findByIdAndDelete(connectionId);

        return {
          code: "OK",
          message: "Connection deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete connection",
        });
      }
    }),

  getConnectionLedger: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);

        const ledgerEntries = await ConnectionLedger.find({
          initiatorId: hostId,
        })
          .populate<{
            userA: Pick<UserType, "username" | "email"> & {
              _id: Types.ObjectId;
            };
          }>("userA", "username email")
          .populate<{
            userB: Pick<UserType, "username" | "email"> & {
              _id: Types.ObjectId;
            };
          }>("userB", "username email")
          .populate<{
            microCircleId: Pick<MicroCircleType, "name" | "color"> & {
              _id: Types.ObjectId;
            };
          }>("microCircleId", "_id name color")
          .sort({ createdAt: -1 })
          .limit(input.limit)
          .skip(input.offset)
          .lean();

        return {
          code: "OK",
          message: "Ledger retrieved successfully",
          entries: ledgerEntries.map((entry) => ({
            _id: entry._id.toString(),
            type: entry.type,
            userA: {
              _id: entry.userA._id.toString(),
              username: entry.userA.username,
              email: entry.userA.email,
            },
            userB: {
              _id: entry.userB._id.toString(),
              username: entry.userB.username,
              email: entry.userB.email,
            },
            microCircle: entry.microCircleId
              ? {
                  _id: entry.microCircleId._id.toString(),
                  name: entry.microCircleId.name,
                  color: entry.microCircleId.color,
                }
              : null,
            notes: entry.notes,
            metadata: entry.metadata,
            timestamp: entry.createdAt,
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch connection ledger",
        });
      }
    }),
});

import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import { z } from "zod";
import { Types } from "mongoose";
import { Connection } from "../model/connection";
import { ConnectionLedger } from "../model/connectionLedger";
import { User } from "../model/auth";
import { TRPCError } from "@trpc/server";

export const connectionRouter = createTRPCRouter({
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const hostId = Types.ObjectId.createFromHexString(ctx.user._id);

      const connections = await Connection.find({ createdBy: hostId })
        .populate("userA", "username email profileImage")
        .populate("userB", "username email profileImage")
        .lean();

      return {
        code: "OK",
        message: "Connections retrieved successfully",
        connections: connections.map((conn) => ({
          _id: (conn._id as Types.ObjectId).toString(),
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

  createmultipleConnections: protectedProcedure
    .input(
      z.object({
        connections: z.array(
          z.object({
            userAId: z.string(),
            userBId: z.string(),
            notes: z.string().optional(),
          })
        ),
        skipHostConnections: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);
        const results: Array<{
          userAId: string;
          userBId: string;
          success: boolean;
          message: string;
          connectionId: string | null;
        }> = [];
        const processedPairs = new Set();

        const allUserIds = [
          ...new Set(
            input.connections.flatMap((conn) => [conn.userAId, conn.userBId])
          ),
        ].map((id) => new Types.ObjectId(id));

        const users = (await User.find({
          _id: { $in: allUserIds },
          hostId: hostId,
        }).lean()) as Array<{ _id: Types.ObjectId }>;

        const validUserIds = new Set(users.map((u) => u._id.toString()));

        for (const conn of input.connections) {
          const userAId = new Types.ObjectId(conn.userAId);
          const userBId = new Types.ObjectId(conn.userBId);

          const pairKey = [userAId.toString(), userBId.toString()]
            .sort()
            .join("_");

          if (processedPairs.has(pairKey)) {
            results.push({
              userAId: conn.userAId,
              userBId: conn.userBId,
              success: false,
              message: "Duplicate connection in batch request",
              connectionId: null,
            });
            continue;
          }

          processedPairs.add(pairKey);

          if (
            input.skipHostConnections &&
            (userAId.equals(hostId) || userBId.equals(hostId))
          ) {
            results.push({
              userAId: conn.userAId,
              userBId: conn.userBId,
              success: true,
              message: "Skipped host connection (using implicit host link)",
              connectionId: null,
            });
            continue;
          }

          if (
            !validUserIds.has(userAId.toString()) ||
            !validUserIds.has(userBId.toString())
          ) {
            results.push({
              userAId: conn.userAId,
              userBId: conn.userBId,
              success: false,
              message:
                "One or both users not found or don't belong to this host",
              connectionId: null,
            });
            continue;
          }

          const existingConnection = await Connection.findOne({
            $or: [
              { userA: userAId, userB: userBId },
              { userA: userBId, userB: userAId },
            ],
          });

          if (existingConnection) {
            results.push({
              userAId: conn.userAId,
              userBId: conn.userBId,
              success: false,
              message: "Connection already exists between these users",
              connectionId: existingConnection._id.toString(),
            });
            continue;
          }

          const connection = new Connection({
            userA: userAId,
            userB: userBId,
            createdBy: hostId,
            notes: conn.notes,
          });

          await connection.save();

          results.push({
            userAId: conn.userAId,
            userBId: conn.userBId,
            success: true,
            message: "Connection created successfully",
            connectionId: connection._id.toString(),
          });
        }

        return {
          code: "OK",
          message: `Created ${results.filter((r) => r.success).length}/${
            input.connections.length
          } connections`,
          results,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create connections",
        });
      }
    }),

  deletemultipleConnections: protectedProcedure
    .input(
      z.object({
        connectionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);
        const connectionIds = input.connectionIds.map(
          (id) => new Types.ObjectId(id)
        );

        const connections = (await Connection.find({
          _id: { $in: connectionIds },
          createdBy: hostId,
        }).lean()) as Array<{ _id: Types.ObjectId }>;

        const validConnectionIds = new Set(
          connections.map((c) => c._id.toString())
        );
        const results: Array<{
          connectionId: string;
          success: boolean;
          message: string;
        }> = [];

        for (const connId of input.connectionIds) {
          if (!validConnectionIds.has(connId)) {
            results.push({
              connectionId: connId,
              success: false,
              message: "Connection not found or unauthorized",
            });
            continue;
          }

          results.push({
            connectionId: connId,
            success: true,
            message: "Connection deleted successfully",
          });
        }

        if (validConnectionIds.size > 0) {
          await Connection.deleteMany({
            _id: {
              $in: Array.from(validConnectionIds).map(
                (id) => new Types.ObjectId(id)
              ),
            },
          });
        }

        return {
          code: "OK",
          message: `Deleted ${results.filter((r) => r.success).length}/${
            input.connectionIds.length
          } connections`,
          results,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete connections",
        });
      }
    }),

  createConnection: protectedProcedure
    .input(
      z.object({
        userAId: z.string(),
        userBId: z.string(),
        notes: z.string().optional(),
        skipHostConnections: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const hostId = Types.ObjectId.createFromHexString(ctx.user._id);
        const userAId = new Types.ObjectId(input.userAId);
        const userBId = new Types.ObjectId(input.userBId);

        if (
          input.skipHostConnections &&
          (userAId.equals(hostId) || userBId.equals(hostId))
        ) {
          return {
            code: "OK",
            message:
              "Skipped host connection (using implicit host link instead)",
            connection: null,
          };
        }

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
          .populate("userA", "username email")
          .populate("userB", "username email")
          .populate("microCircleId", "_id name color")
          .sort({ createdAt: -1 })
          .limit(input.limit)
          .skip(input.offset)
          .lean();

        return {
          code: "OK",
          message: "Ledger retrieved successfully",
          entries: ledgerEntries.map((entry) => ({
            _id: (entry._id as Types.ObjectId).toString(),
            type: entry.type,
            userA: entry.userA
              ? {
                  _id: entry.userA._id.toString(),
                  username: entry.userA.username || "Deleted User",
                  email: entry.userA.email || "account-deleted@example.com",
                }
              : {
                  _id: "deleted",
                  username: "Deleted User",
                  email: "account-deleted@example.com",
                },
            userB: entry.userB
              ? {
                  _id: entry.userB._id.toString(),
                  username: entry.userB.username || "Deleted User",
                  email: entry.userB.email || "account-deleted@example.com",
                }
              : {
                  _id: "deleted",
                  username: "Deleted User",
                  email: "account-deleted@example.com",
                },
            notes: entry.notes,
            metadata: entry.metadata,
            timestamp: entry.createdAt,
          })),
        };
      } catch (error) {
        console.error("Connection ledger error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch connection ledger",
        });
      }
    }),

  getUserConnections: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = Types.ObjectId.createFromHexString(ctx.user._id);

      const connections = await Connection.find({
        $or: [{ userA: userId }, { userB: userId }],
      })
        .populate("userA", "username email profileImage")
        .populate("userB", "username email profileImage")
        .populate("createdBy", "username email profileImage")
        .lean();

      const hostProfile = await User.findById(ctx.user._id, "hostId");
      if (!hostProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Host profile not found",
        });
      }
      const hostObjectId = Types.ObjectId.createFromHexString(
        hostProfile.hostId.toString()
      );
      const hostUser = await User.findById(
        hostObjectId,
        "username email profileImage"
      );
      if (!hostUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Host user not found",
        });
      }

      const connectedUsers = connections.map((conn) => {
        const isUserA = conn.userA._id.toString() === ctx.user._id.toString();
        const otherUser = isUserA ? conn.userB : conn.userA;

        return {
          _id: otherUser._id.toString(),
          username: otherUser.username,
          email: otherUser.email,
          profileImage: otherUser.profileImage,
          connectionId: (conn._id as Types.ObjectId).toString(),
          status: conn.status,
        };
      });
      connectedUsers.push({
        _id: hostUser._id.toString(),
        username: hostUser.username || "Host",
        email: hostUser.email || "host@example.com",
        profileImage: hostUser.profileImage,
        connectionId: "",
        status: "HOST",
      });

      return {
        code: "OK",
        message: "Connected users retrieved successfully",
        users: connectedUsers,
      };
    } catch (error) {
      console.error("Error fetching user connections:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user connections",
      });
    }
  }),
});

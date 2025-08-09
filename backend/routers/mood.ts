import { createTRPCRouter, protectedProcedure } from "../trpc/init";
import { z } from "zod";
import { Types } from "mongoose";
import { Mood, MoodType } from "../model/mood";
import { User } from "../model/auth";
import { MicroCircle, MicroCircleType } from "../model/microCircle";
import { TRPCError } from "@trpc/server";
import { uploadCloudinary } from "../cloudinary/upload";
import { format } from "date-fns-tz";

export const moodRouter = createTRPCRouter({
  createMood: protectedProcedure
    .input(
      z.object({
        mood: z.number().min(1).max(5),
        activities: z.array(z.string()).optional().default([]),
        notes: z.string().optional().default(""),
        privateNotes: z.string().optional().default(""),
        media: z.array(z.string()).optional().default([]),
        music: z
          .object({
            title: z.string().optional(),
            url: z.string().optional(),
            platform: z
              .enum([
                "spotify",
                "youtube",
                "youtubeMusic",
                "appleMusic",
                "other",
              ])
              .optional(),
          })
          .optional()
          .default({}),
        sharing: z
          .object({
            isPrivate: z.boolean().optional().default(false),
            sharedWith: z.array(z.string()).optional().default([]),
            mediaIdToIndexMap: z
              .record(z.string(), z.number())
              .optional()
              .default({}),
            existingCloudinaryMedia: z
              .array(
                z.object({
                  id: z.string(),
                  url: z.string(),
                  type: z.string(),
                })
              )
              .optional()
              .default([]),
            customVersions: z
              .array(
                z.object({
                  userId: z.string(),
                  notes: z.string(),
                  mediaIds: z.array(z.string()).optional().default([]),
                })
              )
              .optional()
              .default([]),
            sharedWithCircles: z
              .array(
                z.object({
                  circleId: z.string(),
                  customNotes: z.string().optional(),
                  mediaIds: z.array(z.string()).optional().default([]),
                })
              )
              .optional()
              .default([]),
          })
          .optional()
          .default({}),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = Types.ObjectId.createFromHexString(ctx.user._id);

        const timezone = input.timezone || "UTC";
        const now = new Date();

        const localDateStr = format(now, "yyyy-MM-dd", { timeZone: timezone });

        const existingEntry = await Mood.findOne({
          userId,
          localDate: localDateStr,
        });

        if (existingEntry) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You already have a mood entry for today",
          });
        }

        const mediaEntries = [];
        const mediaIdToUrlMap = new Map<string, string>();

        if (
          input.sharing.existingCloudinaryMedia &&
          input.sharing.existingCloudinaryMedia.length > 0
        ) {
          for (const existingMedia of input.sharing.existingCloudinaryMedia) {
            mediaEntries.push({
              url: existingMedia.url,
              type: existingMedia.type,
              publicId: "",
            });

            mediaIdToUrlMap.set(existingMedia.id, existingMedia.url);
          }
        }

        if (input.media && input.media.length > 0) {
          for (let i = 0; i < input.media.length; i++) {
            const mediaItem = input.media[i];

            try {
              const result = await uploadCloudinary(
                mediaItem,
                `mood_${ctx.user._id}_${Date.now()}_${i}`
              );

              mediaEntries.push({
                url: result.secure_url,
                type: result.resource_type === "video" ? "video" : "image",
                publicId: result.public_id,
              });

              for (const [mediaId, index] of Object.entries(
                input.sharing.mediaIdToIndexMap
              )) {
                if (index === i) {
                  mediaIdToUrlMap.set(mediaId, result.secure_url);
                  break;
                }
              }
            } catch (err) {
              console.error("Media upload error:", err);
            }
          }
        }

        const sharingData: {
          isPrivate: boolean;
          sharedWith: Types.ObjectId[];
          customVersions: {
            userId: Types.ObjectId;
            notes: string;
            mediaurls?: string[];
          }[];
          sharedWithCircles: {
            memberIds: Types.ObjectId[];
            customNotes?: string;
            mediaurls?: string[];
          }[];
        } = {
          isPrivate: input.sharing.isPrivate,
          sharedWith: [],
          customVersions: [],
          sharedWithCircles: [],
        };

        if (input.sharing.sharedWith && input.sharing.sharedWith.length > 0) {
          const userIds = input.sharing.sharedWith.map(
            (id) => new Types.ObjectId(id)
          );
          const validUsers = await User.find({ _id: { $in: userIds } }).select(
            "_id"
          );
          sharingData.sharedWith = validUsers.map((u) => u._id);
        }

        if (
          input.sharing.customVersions &&
          input.sharing.customVersions.length > 0
        ) {
          for (const version of input.sharing.customVersions) {
            try {
              const userId = new Types.ObjectId(version.userId);
              const userExists = await User.exists({ _id: userId });

              if (userExists) {
                const mediaUrls = version.mediaIds
                  .map((mediaId) => mediaIdToUrlMap.get(mediaId))
                  .filter((url) => url) as string[];

                sharingData.customVersions.push({
                  userId,
                  notes: version.notes,
                  mediaurls: mediaUrls,
                });
              }
            } catch (err) {
              console.error("Invalid user ID in custom versions:", err);
            }
          }
        }

        if (
          input.sharing.sharedWithCircles &&
          input.sharing.sharedWithCircles.length > 0
        ) {
          for (const circle of input.sharing.sharedWithCircles) {
            try {
              const circleDoc = await MicroCircle.findById(
                circle.circleId
              ).lean<MicroCircleType>();

              if (circleDoc && !Array.isArray(circleDoc) && circleDoc.members) {
                const members = circleDoc.members.map(
                  (id: Types.ObjectId) => new Types.ObjectId(id)
                );

                const mediaUrls = circle.mediaIds
                  .map((mediaId) => mediaIdToUrlMap.get(mediaId))
                  .filter((url) => url) as string[];

                sharingData.sharedWithCircles.push({
                  memberIds: members,
                  customNotes: circle.customNotes,
                  mediaurls: mediaUrls,
                });
              }
            } catch (err) {
              console.error("Invalid circle ID:", err);
            }
          }
        }

        const moodEntry = new Mood({
          userId,
          date: new Date(),
          localDate: localDateStr,
          mood: input.mood,
          activities: input.activities,
          notes: input.notes,
          privateNotes: input.privateNotes,
          media: mediaEntries,
          music: input.music,
          sharing: sharingData,
        });

        await moodEntry.save();

        return {
          code: "OK",
          message: "Mood entry created successfully",
          moodEntry: {
            _id: (moodEntry as any)._id.toString(),
            date: moodEntry.date,
            mood: moodEntry.mood,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Error creating mood entry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create mood entry",
        });
      }
    }),

  getMoodEntries: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(1000).default(1000),
        timezone: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const userId = Types.ObjectId.createFromHexString(ctx.user._id);
        const query: any = { userId };
        const timezone = input.timezone || "UTC";
        const startDate = input.startDate
          ? format(new Date(input.startDate), "yyyy-MM-dd", {
              timeZone: timezone,
            })
          : undefined;
        const endDate = input.endDate
          ? format(new Date(input.endDate), "yyyy-MM-dd", {
              timeZone: timezone,
            })
          : undefined;

        if (startDate || endDate) {
          query.localDate = {};
          if (startDate) {
            query.localDate.$gte = startDate;
          }
          if (endDate) {
            query.localDate.$lte = endDate;
          }
        }

        const moodEntries = await Mood.find(query)
          .sort({ localDate: -1 })
          .limit(input.limit)
          .lean();

        const userIdsSet = new Set<string>();
        for (const entry of moodEntries) {
          if (entry.sharing?.customVersions) {
            for (const v of entry.sharing.customVersions) {
              if (v.userId) userIdsSet.add(v.userId.toString());
            }
          }
          if (entry.sharing?.sharedWithCircles) {
            for (const c of entry.sharing.sharedWithCircles) {
              if (Array.isArray(c.memberIds)) {
                for (const id of c.memberIds) {
                  userIdsSet.add(id.toString());
                }
              }
            }
          }
          if (entry.sharing?.sharedWith) {
            for (const id of entry.sharing.sharedWith) {
              userIdsSet.add(id.toString());
            }
          }
        }

        const users = await User.find(
          {
            _id: {
              $in: Array.from(userIdsSet).map((id) =>
                Types.ObjectId.createFromHexString(id)
              ),
            },
          },
          "_id username profileImage"
        ).lean<
          {
            _id: Types.ObjectId | string;
            username: string;
            profileImage?: string;
          }[]
        >();

        const userMap: Record<
          string,
          { _id: string; username: string; profileImage?: string }
        > = {};
        for (const u of users) {
          userMap[(u._id as Types.ObjectId).toString()] = {
            _id: (u._id as Types.ObjectId).toString(),
            username: u.username,
            profileImage: u.profileImage,
          };
        }

        return {
          code: "OK",
          message: "Mood entries retrieved successfully",
          entries: moodEntries.map((entry: any) => ({
            _id: entry._id?.toString(),
            date: entry.date,
            localDate: entry.localDate,
            mood: entry.mood,
            activities: entry.activities,
            notes: entry.notes,
            privateNotes: entry.privateNotes,
            media: entry.media.map((m: any) => ({
              url: m.url,
              type: m.type,
              _id: m._id.toString(),
            })),
            music: entry.music,
            createdAt: entry.createdAt,
            sharing: {
              isPrivate: entry.sharing?.isPrivate || false,
              sharedWith:
                entry.sharing?.sharedWith?.map((id: Types.ObjectId) => ({
                  ...(userMap[id.toString()] || {
                    username: "Unknown",
                    profileImage: undefined,
                  }),
                })) || [],
              customVersions:
                entry.sharing?.customVersions?.map((v: any) => ({
                  user: {
                    ...(userMap[v.userId.toString()] || {
                      username: "Unknown",
                      profileImage: undefined,
                    }),
                  },
                  notes: v.notes,
                  mediaUrls: v.mediaurls || [],
                })) || [],
              sharedWithCircles:
                entry.sharing?.sharedWithCircles?.map((c: any) => ({
                  members: (c.memberIds || []).map((id: Types.ObjectId) => ({
                    ...(userMap[id.toString()] || {
                      username: "Unknown",
                      profileImage: undefined,
                    }),
                  })),
                  customNotes: c.customNotes,
                  mediaUrls: c.mediaurls || [],
                })) || [],
            },
          })),
        };
      } catch (error) {
        console.error("Error fetching mood entries:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch mood entries",
        });
      }
    }),

  getMoodByDate: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        timezone: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const userId = Types.ObjectId.createFromHexString(ctx.user._id);
        const timezone = input.timezone || "UTC";
        const localDate = format(input.date, "yyyy-MM-dd", {
          timeZone: timezone,
        });

        const moodEntry = await Mood.findOne({
          userId,
          localDate,
        }).lean<{ _id: Types.ObjectId | string } & MoodType>();

        if (!moodEntry) {
          return {
            code: "NOT_FOUND",
            message: "No mood entry found for this date",
            entry: null,
          };
        }

        const userIdsSet = new Set<string>();
        if (moodEntry.sharing?.customVersions) {
          for (const v of moodEntry.sharing.customVersions) {
            if (v.userId) userIdsSet.add(v.userId.toString());
          }
        }
        if (moodEntry.sharing?.sharedWithCircles) {
          for (const c of moodEntry.sharing.sharedWithCircles) {
            if (Array.isArray(c.memberIds)) {
              for (const id of c.memberIds) {
                userIdsSet.add(id.toString());
              }
            }
          }
        }
        if (moodEntry.sharing?.sharedWith) {
          for (const id of moodEntry.sharing.sharedWith) {
            userIdsSet.add(id.toString());
          }
        }

        const users = await User.find(
          {
            _id: {
              $in: Array.from(userIdsSet).map((id) =>
                Types.ObjectId.createFromHexString(id)
              ),
            },
          },
          "_id username profileImage"
        ).lean<
          {
            _id: Types.ObjectId | string;
            username: string;
            profileImage?: string;
          }[]
        >();

        return {
          code: "OK",
          message: "Mood entry retrieved successfully",
          entry: moodEntry
            ? {
                _id: moodEntry._id?.toString(),
                date: moodEntry.date,
                mood: moodEntry.mood,
                activities: moodEntry.activities,
                notes: moodEntry.notes,
                privateNotes: moodEntry.privateNotes,
                media: moodEntry.media.map((m) => ({
                  url: m.url,
                  type: m.type,
                  _id: m._id.toString(),
                })),
                music: moodEntry.music,
                sharing: {
                  isPrivate: moodEntry.sharing?.isPrivate || false,
                  sharedWith:
                    moodEntry.sharing?.sharedWith?.map((id: Types.ObjectId) => {
                      const user = users.find(
                        (u) => u._id.toString() === id.toString()
                      );
                      return user
                        ? {
                            username: user.username,
                            profileImage: user.profileImage,
                          }
                        : {
                            username: "Unknown",
                            profileImage: undefined,
                          };
                    }) || [],
                  customVersions:
                    moodEntry.sharing?.customVersions?.map((v) => {
                      const user = users.find(
                        (u) => u._id.toString() === v.userId.toString()
                      );
                      return {
                        user: user
                          ? {
                              username: user.username,
                              profileImage: user.profileImage,
                            }
                          : {
                              username: "Unknown",
                              profileImage: undefined,
                            },
                        notes: v.notes,
                        mediaUrls: v.mediaurls || [],
                      };
                    }) || [],
                  sharedWithCircles:
                    moodEntry.sharing?.sharedWithCircles?.map((c) => ({
                      members: c.memberIds.map((id: Types.ObjectId) => {
                        const user = users.find(
                          (u) => u._id.toString() === id.toString()
                        );
                        return user
                          ? {
                              username: user.username,
                              profileImage: user.profileImage,
                            }
                          : {
                              username: "Unknown",
                              profileImage: undefined,
                            };
                      }),
                      customNotes: c.customNotes,
                      mediaUrls: c.mediaurls || [],
                    })) || [],
                },
              }
            : null,
        };
      } catch (error) {
        console.error("Error fetching mood entry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch mood entry",
        });
      }
    }),

  getSharedMoods: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(31),
        userId: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const userId = Types.ObjectId.createFromHexString(ctx.user._id);
        const filter: any = {};

        if (input.startDate && input.endDate) {
          filter.date = {
            $gte: new Date(input.startDate),
            $lte: new Date(input.endDate),
          };
        }

        const sharedWithMe = await Mood.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [
                    { "sharing.sharedWith": userId },
                    { "sharing.sharedWithCircles.memberIds": userId },
                  ],
                },
                { "sharing.isPrivate": { $ne: true } },
                filter,
              ],
            },
          },
          { $sort: { date: -1 } },
          { $limit: input.limit },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "creator",
            },
          },
          {
            $addFields: {
              directCustomVersion: {
                $filter: {
                  input: "$sharing.customVersions",
                  as: "version",
                  cond: { $eq: ["$$version.userId", userId] },
                },
              },
              circleVersions: {
                $filter: {
                  input: "$sharing.sharedWithCircles",
                  as: "circle",
                  cond: { $in: [userId, "$$circle.memberIds"] },
                },
              },
              creatorInfo: { $arrayElemAt: ["$creator", 0] },
            },
          },
          {
            $project: {
              _id: 1,
              date: 1,
              localDate: 1,
              mood: 1,
              activities: 1,

              user: {
                _id: { $toString: "$userId" },
                username: "$creatorInfo.username",
                profileImage: "$creatorInfo.profileImage",
                email: "$creatorInfo.email",
              },

              generalNotes: "$notes",

              directCustomVersion: {
                $cond: {
                  if: { $gt: [{ $size: "$directCustomVersion" }, 0] },
                  then: {
                    notes: { $arrayElemAt: ["$directCustomVersion.notes", 0] },
                    mediaurls: {
                      $arrayElemAt: ["$directCustomVersion.mediaurls", 0],
                    },
                  },
                  else: null,
                },
              },

              circleCustomVersions: {
                $map: {
                  input: "$circleVersions",
                  as: "circle",
                  in: {
                    customNotes: "$$circle.customNotes",
                    mediaurls: "$$circle.mediaurls",
                  },
                },
              },

              media: 1,
            },
          },
          {
            $project: {
              _id: 1,
              date: 1,
              localDate: 1,
              mood: 1,
              activities: 1,

              user: 1,

              notes: {
                $cond: {
                  if: "$directCustomVersion.notes",
                  then: "$directCustomVersion.notes",
                  else: {
                    $cond: {
                      if: { $gt: [{ $size: "$circleCustomVersions" }, 0] },
                      then: {
                        $cond: {
                          if: {
                            $arrayElemAt: [
                              "$circleCustomVersions.customNotes",
                              0,
                            ],
                          },
                          then: {
                            $arrayElemAt: [
                              "$circleCustomVersions.customNotes",
                              0,
                            ],
                          },
                          else: "$generalNotes",
                        },
                      },
                      else: "$generalNotes",
                    },
                  },
                },
              },

              media: {
                $cond: {
                  if: { $isArray: "$directCustomVersion.mediaurls" },
                  then: {
                    $map: {
                      input: "$directCustomVersion.mediaurls",
                      as: "url",
                      in: {
                        url: "$$url",
                        type: {
                          $cond: {
                            if: {
                              $regexMatch: { input: "$$url", regex: "video" },
                            },
                            then: "video",
                            else: "image",
                          },
                        },
                      },
                    },
                  },
                  else: {
                    $cond: {
                      if: { $gt: [{ $size: "$circleCustomVersions" }, 0] },
                      then: {
                        $map: {
                          input: {
                            $cond: {
                              if: {
                                $isArray: {
                                  $arrayElemAt: [
                                    "$circleCustomVersions.mediaurls",
                                    0,
                                  ],
                                },
                              },
                              then: {
                                $arrayElemAt: [
                                  "$circleCustomVersions.mediaurls",
                                  0,
                                ],
                              },
                              else: [],
                            },
                          },
                          as: "url",
                          in: {
                            url: "$$url",
                            type: {
                              $cond: {
                                if: {
                                  $regexMatch: {
                                    input: "$$url",
                                    regex: "video",
                                  },
                                },
                                then: "video",
                                else: "image",
                              },
                            },
                          },
                        },
                      },
                      else: { $ifNull: ["$media", []] },
                    },
                  },
                },
              },

              customVersion: {
                directVersion: "$directCustomVersion",
                circleVersions: "$circleCustomVersions",

                notes: {
                  $cond: {
                    if: "$directCustomVersion.notes",
                    then: "$directCustomVersion.notes",
                    else: {
                      $cond: {
                        if: { $gt: [{ $size: "$circleCustomVersions" }, 0] },
                        then: {
                          $arrayElemAt: [
                            "$circleCustomVersions.customNotes",
                            0,
                          ],
                        },
                        else: "$generalNotes",
                      },
                    },
                  },
                },
                mediaUrls: {
                  $cond: {
                    if: { $isArray: "$directCustomVersion.mediaurls" },
                    then: "$directCustomVersion.mediaurls",
                    else: {
                      $cond: {
                        if: {
                          $and: [
                            { $gt: [{ $size: "$circleCustomVersions" }, 0] },
                            {
                              $isArray: {
                                $arrayElemAt: [
                                  "$circleCustomVersions.mediaurls",
                                  0,
                                ],
                              },
                            },
                          ],
                        },
                        then: {
                          $arrayElemAt: ["$circleCustomVersions.mediaurls", 0],
                        },
                        else: {
                          $map: { input: "$media", as: "m", in: "$$m.url" },
                        },
                      },
                    },
                  },
                },
              },
              isReceived: true,
            },
          },
        ]);

        return {
          entries: sharedWithMe,
        };
      } catch (error) {
        console.error("Error fetching shared mood entries:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch shared mood entries",
        });
      }
    }),

  checkTodayEntry: protectedProcedure
    .input(
      z.object({
        timezone: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = Types.ObjectId.createFromHexString(ctx.user._id);

        const timezone = input.timezone || "UTC";
        const now = new Date();
        const localDateStr = format(now, "yyyy-MM-dd", { timeZone: timezone });

        const existingEntry = await Mood.findOne({
          userId,
          localDate: localDateStr,
        }).lean();

        return {
          code: "OK",
          hasSubmitted: !!existingEntry,
          entryId:
            existingEntry && (existingEntry as any)._id
              ? (existingEntry as any)._id.toString()
              : null,
        };
      } catch (error) {
        console.error("Error checking today's entry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check today's entry",
        });
      }
    }),
});

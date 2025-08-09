import z from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc/init";
import { User } from "../model/auth";
import { TRPCError } from "@trpc/server";
import { Types } from "mongoose";
import { deleteCloudinaryImage, uploadCloudinary } from "../cloudinary/upload";

export const userRouter = createTRPCRouter({
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("hello");
      const hostObjectId = Types.ObjectId.createFromHexString(ctx.user._id);

      const users = await User.find({ hostId: hostObjectId })
        .select("username UserRole _id email profileImage profileImagePublicId")
        .lean();

      return {
        code: "OK",
        message:
          users.length > 0 ? "Users retrieved successfully" : "No users found",
        users: users.map((user) => ({
          _id: (user._id as Types.ObjectId).toString(),
          email: user.email,
          username: user.username,
          UserRole: user.UserRole,
          profileImage: user.profileImage || null,
          profileImagePublicId: user.profileImagePublicId || null,
        })),
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users",
      });
    }
  }),
  uploadProfileImage: protectedProcedure
    .input(
      z.object({
        imageData: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await uploadCloudinary(
          input.imageData,
          ctx.user._id.toString()
        );

        await User.findByIdAndUpdate(ctx.user._id, {
          profileImage: result.secure_url,
          profileImagePublicId: result.public_id,
        });

        console.log("Image uploaded successfully:", result);

        return {
          code: "OK",
          message: "Profile image uploaded successfully",
          imageUrl: result.secure_url,
        };
      } catch (error) {
        console.error("Image upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload image",
        });
      }
    }),

  deleteProfileImage: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const user = await User.findById(ctx.user._id);

      if (user.profileImagePublicId) {
        await deleteCloudinaryImage(user.profileImagePublicId);
      }

      await User.findByIdAndUpdate(ctx.user._id, {
        $unset: { profileImage: "", profileImagePublicId: "" },
      });

      return {
        code: "OK",
        message: "Profile image deleted successfully",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete image",
      });
    }
  }),

  updateUsername: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await User.findById(ctx.user._id);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const TEN_MINUTES = 10 * 60 * 1000;

        if (user.updatedAt) {
          const timeSinceLastChange =
            Date.now() - new Date(user.updatedAt).getTime();

          if (timeSinceLastChange < TEN_MINUTES) {
            const remainingSeconds = Math.ceil(
              (TEN_MINUTES - timeSinceLastChange) / 1000
            );
            const remainingMinutes = Math.floor(remainingSeconds / 60);
            const remainingSecs = remainingSeconds % 60;

            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: `Please wait ${remainingMinutes}:${
                remainingSecs < 10 ? "0" : ""
              }${remainingSecs} before changing your username again.`,
            });
          }
        }

        const updatedUser = await User.findByIdAndUpdate(
          ctx.user._id,
          { username: input.username },
          { new: true }
        );

        return {
          code: "OK",
          message: "Username updated successfully",
          user: {
            _id: updatedUser._id.toString(),
            username: updatedUser.username,
            nextUsernameChangeAllowedAt: new Date(Date.now() + TEN_MINUTES),
          },
        };
      } catch (error) {
        console.error("Error updating username:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update username",
        });
      }
    }),

  hostCount: publicProcedure.query(async () => {
    const count = await User.countDocuments({ UserRole: "host" });
    return { count };
  }),
});

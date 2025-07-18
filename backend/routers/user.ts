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

      console.log("Fetched users:", users);

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
        imageData: z.string(), // base64 image data
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
});

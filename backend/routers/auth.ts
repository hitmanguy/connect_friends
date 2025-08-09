import z from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc/init";
import {
  hashPassword,
  generateSalt,
  verifyPassword,
} from "../auth/PasswordHash";
import { User } from "../model/auth";
import { TRPCError } from "@trpc/server";
import { createSession, removeUserSession } from "../auth/session";
import {
  sendVerificationEmail,
  verifyOTP,
  generateToken,
  deleteToken,
  verifyToken,
} from "../auth/VerifyUser";
import { cookies } from "next/headers";
import { getOAuthClient } from "../auth/oauth/base";
import { createInvite } from "../auth/invite";
import { Invite } from "../model/invite";
import {
  generatePassToken,
  verifyPassToken,
  deletePassToken,
  sendVerificationEmailChangepassword,
} from "../auth/VerifyPasswordChange";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid email or password",
        });
      }
      const isPasswordValid = await verifyPassword(
        password,
        user.password,
        user.salt
      );
      if (!isPasswordValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      const token = await generateToken(user.email);

      return {
        code: "OK",
        message: "Login successful",
        token: token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.UserRole,
        },
      };
    }),

  verifyToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { token } = input;
      const email = (await cookies()).get("connect_friends_email")?.value;
      if (!email) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No email found in cookies",
        });
      }
      const isValid = await verifyToken(email.toLowerCase(), token);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
        });
      }
      return {
        code: "OK",
        message: "Token is valid",
        user: {
          email: email.toLowerCase(),
        },
      };
    }),

  sendVerificationEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      try {
        await sendVerificationEmail(user.email);
        return {
          code: "OK",
          message: "Verification email sent successfully",
        };
      } catch (error) {
        console.error("Error sending verification email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification email",
        });
      }
    }),

  verifyUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        otp: z.string().length(6),
      })
    )
    .mutation(async ({ input }) => {
      const { email, otp } = input;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const isVerified = await verifyOTP(user.email, otp);
      if (!isVerified) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid OTP" });
      }

      try {
        await deleteToken(user.email);
        await createSession(user);

        return {
          code: "OK",
          message: "User verified successfully",
          user: {
            email: user.email,
            role: user.UserRole,
          },
        };
      } catch (error) {
        console.error("Error during user verification:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User verification failed",
        });
      }
    }),

  register: publicProcedure
    .input(
      z.object({
        username: z.string(),
        email: z.string().email(),
        password: z.string(),
        confirmPassword: z.string(),
        code: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { username, email, password, confirmPassword, code } = input;

      if (password !== confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already in use",
        });
      }

      const hostId = await Invite.findOne({ code: code });
      if (code && !hostId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite code not found",
        });
      }

      try {
        const salt = generateSalt();
        const hashedPassword = await hashPassword(password, salt);

        const newUser = new User({
          username,
          email: email.toLowerCase(),
          hostId: hostId ? hostId.createdBy : null,
          password: hashedPassword,
          salt,
          UserRole: hostId ? "user" : "host",
        });

        await newUser.save();

        const token = await generateToken(newUser.email);

        return {
          code: "OK",
          message: "Registration successful",
          token: token,
          user: {
            email: newUser.email,
            role: newUser.UserRole,
          },
        };
      } catch (error) {
        console.error("Error during registration:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Registration failed",
        });
      }
    }),

  logout: publicProcedure.mutation(async () => {
    await removeUserSession();
    return {
      code: "OK",
      message: "Logout successful",
    };
  }),

  getCurrentUser: protectedProcedure
    .input(
      z.object({
        fulluser: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      if (input.fulluser) {
        const user = await User.findById(ctx.user._id);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        return {
          code: "OK",
          message: "User retrieved successfully",
          _id: user._id.toString(),
          role: user.UserRole,
          user: user,
        };
      }
      return {
        code: "OK",
        message: "User session retrieved successfully",
        _id: ctx.user._id.toString(),
        role: ctx.user.UserRole,
      };
    }),

  oauthLogin: publicProcedure
    .input(
      z.object({
        provider: z.enum(["google"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const oAuthClient = getOAuthClient(input.provider);
        const url = await oAuthClient.createAuthUrl();
        console.log("Redirecting to OAuth URL:", url);
        return {
          code: "OK",
          message: "OAuth URL generated successfully",
          redirectUrl: url,
        };
      } catch (error) {
        console.error("Error generating OAuth URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate OAuth URL",
        });
      }
    }),

  createInvite: protectedProcedure
    .input(
      z.object({
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.UserRole !== "host") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only hosts can create invites",
        });
      }
      console.log("Creating invite for user:", ctx.user._id);
      const { expiresAt } = input;
      try {
        const invite = await createInvite(ctx.user._id, expiresAt);
        return {
          code: "OK",
          message: "Invite created successfully",
          invite: invite,
        };
      } catch (error) {
        console.error("Error creating invite:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invite",
        });
      }
    }),

  getInvites: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.UserRole !== "host") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only hosts can view invites",
      });
    }
    try {
      const invites = await Invite.find({ createdBy: ctx.user._id })
        .select("code expiresAt createdAt userJoinedIds")
        .lean();
      return {
        code: "OK",
        message: "Invites retrieved successfully",
        invites,
      };
    } catch (error) {
      console.error("Error retrieving invites:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve invites",
      });
    }
  }),

  getInvitebyCode: publicProcedure
    .input(
      z.object({
        code: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { code } = input;
      try {
        const invite = await Invite.findOne({ code: code });

        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invite not found",
          });
        }

        const user = await User.findById(invite.createdBy)
          .select("username")
          .lean();

        const username =
          user && !Array.isArray(user) && typeof user.username === "string"
            ? user.username
            : "Unknown";

        return {
          code: "OK",
          message: "Invite retrieved successfully",
          invite: {
            username: username,
          },
        };
      } catch (error) {
        console.error("Error retrieving invite by code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve invite by code",
        });
      }
    }),

  deleteInvite: protectedProcedure
    .input(
      z.object({
        inviteId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.UserRole !== "host") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only hosts can delete invites",
        });
      }
      const { inviteId } = input;
      try {
        const invite = await Invite.findById(inviteId);
        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invite not found",
          });
        }
        if (invite.createdBy.toString() !== ctx.user._id.toString()) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete your own invites",
          });
        }
        await Invite.deleteOne({ _id: inviteId });
        return {
          code: "OK",
          message: "Invite deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting invite:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete invite",
        });
      }
    }),

  changePassword: publicProcedure
    .input(
      z.object({
        newPassword: z.string().min(6),
        confirmNewPassword: z.string().min(6),
        email: z.string().email(),
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { newPassword, confirmNewPassword } = input;

      if (newPassword !== confirmNewPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      try {
        const user = await User.findOne({ email: input.email });
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const salt = generateSalt();
        const hashedPassword = await hashPassword(newPassword, salt);

        user.password = hashedPassword;
        user.salt = salt;
        await user.save();

        await deletePassToken(user.email);

        return {
          code: "OK",
          message: "Password changed successfully",
        };
      } catch (error) {
        console.error("Error changing password:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to change password",
        });
      }
    }),

  SendPassemail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        baseurl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;
      try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        const token = await generatePassToken(user.email);
        const link = `${
          input.baseurl
        }/auth/reset-password?token=${token}&email=${encodeURIComponent(
          user.email
        )}`;
        await sendVerificationEmailChangepassword(user.email, link);
        return {
          code: "OK",
          message: "Verification email sent successfully",
        };
      } catch (error) {
        console.error("Error sending verification email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification email",
        });
      }
    }),

  verifyPassToken: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { email, token } = input;
      try {
        const isValid = await verifyPassToken(email.toLowerCase(), token);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired token",
          });
        }
        return {
          code: "OK",
          message: "Token is valid",
        };
      } catch (error) {
        console.error("Error verifying password token:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify password token",
        });
      }
    }),
});

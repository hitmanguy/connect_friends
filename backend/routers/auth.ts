import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc/init";
import { hashPassword,generateSalt,verifyPassword} from "../auth/PasswordHash";
import { User } from "../model/auth";
import { TRPCError } from "@trpc/server";
import { use } from "react";
import { createSession, removeUserSession } from "../auth/session";

export const authRouter = createTRPCRouter({
    login: publicProcedure
       .input(z.object({
            email: z.string().email(),
            password: z.string(),
        }))
        .mutation(async ({input}) =>{
            const {email, password} = input;
            const user = await User.findOne({ email: email.toLowerCase() });
            if(!user){
                throw new TRPCError({ 
                    code: 'NOT_FOUND', 
                    message: 'Invalid email or password'
                });
            }
            const isPasswordValid = await verifyPassword(password, user.password, user.salt);
            if(!isPasswordValid){
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
            }

            await createSession(user);

            return {
                code: 'OK',
                message: 'Login successful',
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    role: user.UserRole,
                },
            }
        }
       ),
    register: publicProcedure
        .input(z.object({
            username: z.string(),
            email: z.string().email(),
            password: z.string(),
            confirmPassword: z.string()
        }))
        .mutation(async ({input})=>{
            const { username, email, password, confirmPassword } = input;

            if (password !== confirmPassword) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passwords do not match' });
            }

            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                throw new TRPCError({ code: 'CONFLICT', message: 'Email already in use' });
            }

            try {
                const salt = generateSalt();
                const hashedPassword = await hashPassword(password, salt);

                const newUser = new User({
                    username,
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    salt,
                    UserRole: 'host',
                });

                await newUser.save();

                await createSession(newUser);

                return {
                    code: 'OK',
                    message: 'Registration successful',
                    user: {
                        id: newUser._id.toString(),
                        email: newUser.email,
                        role: newUser.UserRole,
                    },
                };
            } catch (error) {
                console.error("Error during registration:", error);
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Registration failed' });
            }
        }),

    logout: publicProcedure
        .mutation(async ()=>{
            await removeUserSession();
            return {
                code: 'OK',
                message: 'Logout successful',
            };
        }),

    getCurrentUser: protectedProcedure
        .input(z.object({
            fulluser: z.boolean().optional().default(false),
        }))
        .query(async ({ ctx,input }) => {
            if (!ctx.session) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
            }
            if (input.fulluser) {
                const user = await User.findById(ctx.session._id);
                if (!user) {
                    throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
                }
                return {
                    code: 'OK',
                    message: 'User retrieved successfully',
                    user: user,
                }
            }
            return {
                code: 'OK',
                message: 'User session retrieved successfully',
                id: ctx.session._id,
                role: ctx.session.UserRole,
            };
        }),
    
});
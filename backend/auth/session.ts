import { redis } from "../../redis/redis_up";
import { z } from "zod";
import { userRoles } from "../model/auth";
import { cookies } from "next/headers";

const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_SESSION_KEY = "connect_friends_session";

const sessionSchema = z.object({
  _id: z
    .any()
    .transform((val) =>
      typeof val === "object" &&
      val !== null &&
      typeof val.toString === "function"
        ? val.toString()
        : String(val)
    ),
  UserRole: z.enum(userRoles),
});

type UserSession = z.infer<typeof sessionSchema>;

export async function getUserfromSession() {
  const sessionCookie = (await cookies()).get(COOKIE_SESSION_KEY)?.value;
  if (!sessionCookie) {
    return null;
  }
  const userData = await getUserSessionbyId(sessionCookie);
  return userData;
}

export async function UpdateSessionData(user: UserSession) {
  const sessionId = (await cookies()).get(COOKIE_SESSION_KEY)?.value;
  if (!sessionId) {
    throw new Error("Session not found");
  }
  await redis.set(`session:${sessionId}`, sessionSchema.parse(user), {
    ex: SESSION_EXPIRATION_SECONDS,
  });
}

export async function createSession(user: UserSession) {
  const sessionId = crypto
    .getRandomValues(new Uint8Array(512))
    .reduce((acc, byte) => acc + byte.toString(16).padStart(2, "0"), "")
    .normalize();
  await redis.set(`session:${sessionId}`, sessionSchema.parse(user), {
    ex: SESSION_EXPIRATION_SECONDS,
  });
  await setCookie(sessionId);
}

export async function updateUserSessionExpiry() {
  const sessionId = (await cookies()).get(COOKIE_SESSION_KEY)?.value;
  if (!sessionId) {
    return null;
  }
  const userSession = await getUserSessionbyId(sessionId);
  if (!userSession) {
    throw new Error("Session not found");
  }
  await redis.set(`session:${sessionId}`, userSession, {
    ex: SESSION_EXPIRATION_SECONDS,
  });
  await setCookie(sessionId);
}

export async function removeUserSession() {
  const sessionId = (await cookies()).get(COOKIE_SESSION_KEY)?.value;
  if (!sessionId) {
    throw new Error("Session not found");
  }
  await redis.del(`session:${sessionId}`);
  (await cookies()).delete(COOKIE_SESSION_KEY);
}

async function setCookie(sessionId: string) {
  (await cookies()).set(COOKIE_SESSION_KEY, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_EXPIRATION_SECONDS,
  });
}

async function getUserSessionbyId(sessionId: string) {
  const rawUser = await redis.get(`session:${sessionId}`);
  if (!rawUser) {
    return null;
  }
  const { data, success } = sessionSchema.safeParse(rawUser);
  return success ? data : null;
}

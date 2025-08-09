import { redis } from "../../redis/redis_up";
import { z } from "zod";
import { cookies } from "next/headers";

const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_SESSION_KEY = "connect_friends_session";
const userRoles = ["user", "host"] as const;

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

export async function getUserfromSession() {
  const sessionCookie = (await cookies()).get(COOKIE_SESSION_KEY)?.value;
  if (!sessionCookie) {
    return null;
  }
  console.log("Fetching session from Redis for:");
  const userData = await getUserSessionbyId(sessionCookie);
  return userData;
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

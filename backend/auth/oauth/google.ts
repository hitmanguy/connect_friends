import { z } from "zod"
import { OAuthClient } from "./base"

// Google user response schema
const googleUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().url().optional(),
  verified_email: z.boolean().optional(),
  locale: z.string().optional(),
})

type GoogleUser = z.infer<typeof googleUserSchema>

// Google OAuth URLs
const GOOGLE_OAUTH_URLS = {
  auth: "https://accounts.google.com/o/oauth2/v2/auth",
  token: "https://oauth2.googleapis.com/token",
  user: "https://www.googleapis.com/oauth2/v2/userinfo",
} as const

// Google OAuth scopes
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
] as const

export function createGoogleOAuthClient() {
  return new OAuthClient<GoogleUser>({
    provider: "google",
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    scopes: [...GOOGLE_SCOPES],
    urls: GOOGLE_OAUTH_URLS,
    userInfo: {
      schema: googleUserSchema,
      parser: (data: GoogleUser) => ({
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        givenName: data.given_name,
        familyName: data.family_name,
      }),
    },
  })
}

// Export types for use in other files
export type { GoogleUser }
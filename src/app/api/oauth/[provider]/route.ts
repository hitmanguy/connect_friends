import { getOAuthClient } from "../../../../../backend/auth/oauth/base"
import { createSession } from "../../../../../backend/auth/session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { NextRequest } from "next/server"
import { z } from "zod"
import { User, OAuthAccount,oAuthProviders } from "../../../../../backend/model/auth"

type OAuthProvider = typeof oAuthProviders[number]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await params
    const code = request.nextUrl.searchParams.get("code")
    const state = request.nextUrl.searchParams.get("state")
    
    const providerResult = z.enum(oAuthProviders).safeParse(rawProvider)
    if (!providerResult.success) {
      console.error("Invalid OAuth provider:", rawProvider)
      redirect(
        `/sign-in?oauthError=${encodeURIComponent(
          "Invalid authentication provider."
        )}`
      )
    }
    
    const provider = providerResult.data

    if (typeof code !== "string" || typeof state !== "string") {
      console.error("Missing code or state parameters")
      redirect(
        `/sign-in?oauthError=${encodeURIComponent(
          "Authentication failed. Missing required parameters."
        )}`
      )
    }

    const oAuthClient = getOAuthClient(provider)
    const cookieStore = await cookies()
    
    try {
      const oAuthUser = await oAuthClient.fetchUser(code, state, {
        get: (name: string) => cookieStore.get(name)
      })
      
      const user = await connectUserToAccount(oAuthUser, provider)
      
      await createSession({
        _id: user._id.toString(),
        UserRole: user.UserRole
      })
      
      console.log("OAuth login successful for user:", user._id)
    
      redirect(new URL(`/${user.UserRole}`, request.url).toString());
      
    } catch (oauthError) {
      if (oauthError && typeof oauthError === 'object' && 'digest' in oauthError && 
        String(oauthError.digest).includes('NEXT_REDIRECT')) {
      throw oauthError;
    }
      console.error("OAuth authentication error:", oauthError)
      
      if (oauthError instanceof Error) {
        if (oauthError.message.includes("expired")) {
          redirect(
            `/sign-in?oauthError=${encodeURIComponent(
              "Authentication session expired. Please try again."
            )}`
          )
        }
        
        if (oauthError.message.includes("Invalid")) {
          redirect(
            `/sign-in?oauthError=${encodeURIComponent(
              "Invalid authentication. Please try again."
            )}`
          )
        }
      }
      
      redirect(
        `/sign-in?oauthError=${encodeURIComponent(
          "Authentication failed. Please try again."
        )}`
      )
    }

  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && 
        String(error.digest).includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("Unexpected OAuth route error:", error);
    redirect(
      `/sign-in?oauthError=${encodeURIComponent(
        "An unexpected error occurred. Please try again."
      )}`
    )
  }
}

async function connectUserToAccount(
  { id, email, name }: { id: string; email: string; name: string },
  provider: OAuthProvider
) {
  try {
    let user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      throw new Error("User not registered. Please create an account first before using OAuth login.")
    }

    let oauthAccount = await OAuthAccount.findOne({
      provider,
      providerAccountId: id,
      userId: user._id
    })

    if (!oauthAccount) {
      oauthAccount = new OAuthAccount({
        provider,
        providerAccountId: id,
        userId: user._id,
        createdAt: new Date()
      })
      
      await oauthAccount.save()
      console.log("Linked OAuth account to user:", user._id)
    }

    return user
    
  } catch (error) {
    console.error("Database error in connectUserToAccount:", error)
    throw new Error("Failed to create or connect user account")
  }
}
import { z } from "zod"
import { createGoogleOAuthClient } from "./google"
import { cookies } from "next/headers"

const STATE_COOKIE_KEY = "oAuthState"
const CODE_VERIFIER_COOKIE_KEY = "oAuthCodeVerifier"
// Ten minutes in seconds
const COOKIE_EXPIRATION_SECONDS = 60 * 10

function generateRandomString(length: number = 64): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return Array.from({ length }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

async function sha256Hash(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert to base64url
    const base64 = btoa(String.fromCharCode(...hashArray));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  // Fallback - this won't work in production but prevents errors
  throw new Error('Web Crypto API not available');
}

export class OAuthClient<T> {
  private readonly provider: OAuthProvider
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly scopes: string[]
  private readonly urls: {
    auth: string
    token: string
    user: string
  }
  private readonly userInfo: {
    schema: z.ZodSchema<T>
    parser: (data: T) => { id: string; email: string; name: string }
  }
  private readonly tokenSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
  })

  constructor({
    provider,
    clientId,
    clientSecret,
    scopes,
    urls,
    userInfo,
  }: {
    provider: OAuthProvider
    clientId: string
    clientSecret: string
    scopes: string[]
    urls: {
      auth: string
      token: string
      user: string
    }
    userInfo: {
      schema: z.ZodSchema<T>
      parser: (data: T) => { id: string; email: string; name: string }
    }
  }) {
    this.provider = provider
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.scopes = scopes
    this.urls = urls
    this.userInfo = userInfo
  }

  private get redirectUrl() {
    return new URL(this.provider, process.env.OAUTH_REDIRECT_URL_BASE)
  }

  async createAuthUrl() {
    const cookieStore = await cookies();
    const state = await createState(cookieStore)
    const codeVerifier = await createCodeVerifier(cookieStore)
    const url = new URL(this.urls.auth)
    url.searchParams.set("client_id", this.clientId)
    url.searchParams.set("redirect_uri", this.redirectUrl.toString())
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", this.scopes.join(" "))
    url.searchParams.set("state", state)
    url.searchParams.set("code_challenge_method", "S256")
    url.searchParams.set(
      "code_challenge",
      await sha256Hash(codeVerifier)
    )
    return url.toString()
  }

  async fetchUser(code: string, state: string, cookies: Pick<Cookies, "get">) {
    const isValidState = await validateState(state, cookies)
    if (!isValidState) throw new InvalidStateError()

    const { accessToken, tokenType } = await this.fetchToken(
      code,
      getCodeVerifier(cookies)
    )

    const user = await fetch(this.urls.user, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
      },
    })
      .then(res => res.json())
      .then(rawData => {
        const { data, success, error } = this.userInfo.schema.safeParse(rawData)
        if (!success) throw new InvalidUserError(error)

        return data
      })

    return this.userInfo.parser(user)
  }

  private fetchToken(code: string, codeVerifier: string) {
    return fetch(this.urls.token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        redirect_uri: this.redirectUrl.toString(),
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: codeVerifier,
      }),
    })
      .then(res => res.json())
      .then(rawData => {
        const { data, success, error } = this.tokenSchema.safeParse(rawData)
        if (!success) throw new InvalidTokenError(error)

        return {
          accessToken: data.access_token,
          tokenType: data.token_type,
        }
      })
  }
}

export function getOAuthClient(provider: OAuthProvider) {
  switch (provider) {
    case "google":
      return createGoogleOAuthClient()
    default:
      throw new Error(`Invalid provider: ${provider satisfies never}`)
  }
}

class InvalidTokenError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid Token")
    this.cause = zodError
  }
}

class InvalidUserError extends Error {
  constructor(zodError: z.ZodError) {
    super("Invalid User")
    this.cause = zodError
  }
}

class InvalidStateError extends Error {
  constructor() {
    super("Invalid State")
  }
}

class InvalidCodeVerifierError extends Error {
  constructor() {
    super("Invalid Code Verifier")
  }
}

async function createState(cookies: Pick<Cookies, "set">) {
  const state = generateRandomString(64)
  cookies.set(STATE_COOKIE_KEY, state, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    expires: Date.now() + COOKIE_EXPIRATION_SECONDS * 1000,
  })
  return state
}

async function createCodeVerifier(cookies: Pick<Cookies, "set">) {
  const codeVerifier = generateRandomString(64)
  cookies.set(CODE_VERIFIER_COOKIE_KEY, codeVerifier, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    expires: Date.now() + COOKIE_EXPIRATION_SECONDS * 1000,
  })
  return codeVerifier
}

function validateState(state: string, cookies: Pick<Cookies, "get">) {
  const cookieState = cookies.get(STATE_COOKIE_KEY)?.value
  return cookieState === state
}

function getCodeVerifier(cookies: Pick<Cookies, "get">) {
  const codeVerifier = cookies.get(CODE_VERIFIER_COOKIE_KEY)?.value
  if (codeVerifier == null) throw new InvalidCodeVerifierError()
  return codeVerifier
}

// Add missing type definitions if not imported elsewhere
type OAuthProvider = "google";
type Cookies = {
  set: (name: string, value: string, options?: any) => void
  get: (name: string) => { value: string } | undefined
}
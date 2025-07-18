import { NextResponse, type NextRequest } from "next/server";
import {
  getUserfromSession,
  updateUserSessionExpiry,
} from "../backend/auth/session";

const userRoutes = ["/user"];
const hostRoutes = ["/host"];

export async function middleware(request: NextRequest) {
  const response = (await middlewareAuth(request)) ?? NextResponse.next();
  await updateUserSessionExpiry();
  return response;
}

export async function middlewareAuth(request: NextRequest) {
  if (userRoutes.includes(request.nextUrl.pathname)) {
    const user = await getUserfromSession();
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (user.UserRole !== "user") {
      return NextResponse.redirect(new URL("/host", request.url));
    }
    return NextResponse.next();
  }
  if (hostRoutes.includes(request.nextUrl.pathname)) {
    const user = await getUserfromSession();
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (user.UserRole !== "host") {
      return NextResponse.redirect(new URL("/user", request.url));
    }
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/verify")) {
    const user = await getUserfromSession();
    if (!user) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL(`/${user.UserRole}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
  // matcher: ['/host/:path*', '/user/:path*']
};

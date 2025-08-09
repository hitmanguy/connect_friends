import { NextResponse, type NextRequest } from "next/server";
import {
  getUserfromSession,
  updateUserSessionExpiry,
} from "../backend/auth/session_for_edge";

const userRoutes = "/user";
const hostRoutes = "/host";

export async function middleware(request: NextRequest) {
  const response = (await middlewareAuth(request)) ?? NextResponse.next();
  await updateUserSessionExpiry();
  return response;
}

export async function middlewareAuth(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith(userRoutes)) {
    const user = await getUserfromSession();
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (user.UserRole !== "user") {
      return NextResponse.redirect(new URL("/host", request.url));
    }
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith(hostRoutes)) {
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
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

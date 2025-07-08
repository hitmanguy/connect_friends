import { NextResponse,type NextRequest } from "next/server";
import { getUserfromSession,updateUserSessionExpiry } from "../backend/auth/session";

const userRoutes = ["/user"]
const hostRoutes = ["/host"]

export async function middleware(request: NextRequest) {
    const response = (await middlewareAuth(request)) ?? NextResponse.next();
    await updateUserSessionExpiry();
    return response;
}

export async function middlewareAuth(request: NextRequest) {
    const user = await getUserfromSession();
    console.log("Checking auth for path:", request.nextUrl.pathname);
    console.log("User in middleware:", user);
    if (userRoutes.includes(request.nextUrl.pathname)) {
        if (!user) {
            return NextResponse.redirect(new URL("/", request.url));
        }
        if (user.UserRole !== 'user') {
            return NextResponse.redirect(new URL("/host", request.url));
        }
        return NextResponse.next();
    }
    if (hostRoutes.includes(request.nextUrl.pathname)) {
        if (!user){
            return NextResponse.redirect(new URL("/", request.url));
        }
        if (user.UserRole !== 'host'){
            return NextResponse.redirect(new URL("/user", request.url));
        }
        return NextResponse.next();
    }
    return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
   // matcher: ['/host/:path*', '/user/:path*']
}
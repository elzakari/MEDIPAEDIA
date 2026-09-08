import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/brand") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public paths on patient store (public landing page, auth modal, marketplace browse)
  if (pathname === "/" || pathname === "/auth" || pathname === "/login" || pathname === "/marketplace") {
    return NextResponse.next();
  }

  // Protected paths: /dashboard, /wallet, /cards, /prescriptions, /orders, /checkout
  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|favicon.ico|brand).*)"],
};

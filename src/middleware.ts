import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const ADMIN_ONLY_PREFIXES = ["/admin"];
const MANAGER_PREFIXES = ["/manager"];
const INSTRUCTOR_PREFIXES = ["/instrutor"];
const PUBLIC_PREFIXES = ["/login", "/verify", "/api/auth", "/api/integrations/hris"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard?erro=acesso-negado", req.nextUrl.origin));
  }

  if (
    MANAGER_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !["ADMIN", "MANAGER"].includes(role)
  ) {
    return NextResponse.redirect(new URL("/dashboard?erro=acesso-negado", req.nextUrl.origin));
  }

  if (
    INSTRUCTOR_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !["ADMIN", "MANAGER", "INSTRUCTOR"].includes(role)
  ) {
    return NextResponse.redirect(new URL("/dashboard?erro=acesso-negado", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};

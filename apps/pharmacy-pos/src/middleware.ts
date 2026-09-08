import { NextResponse, type NextRequest } from "next/server";

const CLINICAL_HATS = [
  "HOSPITAL_ADMIN",
  "TENANT_ADMIN",
  "DOCTOR",
  "NURSE",
  "RECORD_CLERK",
  "RECORDS_CLERK",
  "HOSPITAL_FINANCE",
] as const;

const PHARMACY_HATS = [
  "PHARMACY_ADMIN",
  "PHARMACIST",
  "SUPERINTENDENT_PHARMACIST",
  "PHARMACY_FINANCE",
] as const;

const normalizeRole = (r: string): string =>
  String(r || "").trim().toUpperCase().replace(/RECORDS_CLERK/g, "RECORD_CLERK");

const resolveRoleList = (payload: any): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: any) => {
    if (!raw) return;
    const r = normalizeRole(raw);
    if (!r || seen.has(r)) return;
    seen.add(r);
    out.push(r);
  };
  if (Array.isArray(payload?.roles)) payload.roles.forEach(push);
  if (payload?.primary_role) push(payload.primary_role);
  if (payload?.role) push(payload.role);
  return out;
};

const hasAnyRole = (roles: string[], expected: readonly string[]): boolean => {
  const e = new Set(expected.map(normalizeRole));
  if (roles.includes("SUPER_ADMIN")) return true;
  return roles.some((r) => e.has(r));
};

const pickPrimaryPharmacyRole = (roles: string[]): string => {
  const order = [
    "SUPER_ADMIN",
    "PHARMACY_ADMIN",
    "TENANT_ADMIN",
    "SUPERINTENDENT_PHARMACIST",
    "PHARMACY_FINANCE",
    "PHARMACIST",
  ];
  for (const o of order) if (roles.includes(o)) return o;
  return roles[0] || "PHARMACIST";
};

const pickPrimaryClinicalRole = (roles: string[]): string => {
  const order = [
    "SUPER_ADMIN",
    "HOSPITAL_ADMIN",
    "TENANT_ADMIN",
    "DOCTOR",
    "NURSE",
    "HOSPITAL_FINANCE",
    "RECORD_CLERK",
  ];
  for (const o of order) if (roles.includes(o)) return o;
  return roles[0] || "HOSPITAL_ADMIN";
};

const getPharmacyHome = (role: string): string => {
  if (role === "PHARMACY_ADMIN" || role === "SUPER_ADMIN" || role === "TENANT_ADMIN") return "/pharmacy-admin";
  if (role === "SUPERINTENDENT_PHARMACIST") return "/superintendent";
  if (role === "PHARMACY_FINANCE") return "/pharmacy-finance";
  if (role === "PHARMACIST") return "/dispensary/pos";
  return "/dispensary/pos";
};

const getClinicalHome = (role: string): string => {
  switch (role) {
    case "SUPER_ADMIN":
      return "http://localhost:3000/super-admin";
    case "HOSPITAL_ADMIN":
    case "TENANT_ADMIN":
      return "http://localhost:3000/hospital-admin";
    case "DOCTOR":
      return "http://localhost:3000/doctor/queue";
    case "NURSE":
      return "http://localhost:3000/nurse/triage";
    case "RECORD_CLERK":
      return "http://localhost:3000/reception";
    case "HOSPITAL_FINANCE":
      return "http://localhost:3000/finance";
    default:
      return "http://localhost:3000/";
  }
};

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

  if (pathname === "/login" || pathname.startsWith("/onboard") || pathname === "/forgot-password" || pathname.startsWith("/reset-password")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    const returnUrl = `${pathname}${request.nextUrl.search || ""}`;
    loginUrl.searchParams.set("returnUrl", returnUrl);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      const roles = resolveRoleList(payload);
      const primaryRole = pickPrimaryPharmacyRole(roles);
      const hasClinicalHat = hasAnyRole(roles, CLINICAL_HATS);
      const hasPharmacyHat = hasAnyRole(roles, PHARMACY_HATS);
      const pureClinician = hasClinicalHat && !hasPharmacyHat;

      if (roles.includes("SUPER_ADMIN") && pathname.startsWith("/super-admin")) {
        const target = new URL("http://localhost:3000/super-admin");
        target.search = request.nextUrl.search;
        return NextResponse.redirect(target, 307);
      }

      if (pureClinician) {
        const clinicalPrimary = pickPrimaryClinicalRole(roles);
        const target = new URL(getClinicalHome(clinicalPrimary));
        target.search = request.nextUrl.search;
        return NextResponse.redirect(target, 307);
      }

      if (pathname === "/") {
        if (roles.length === 0) {
          const loginUrl = new URL("/login", request.url);
          return NextResponse.redirect(loginUrl);
        }
        return NextResponse.redirect(new URL(getPharmacyHome(primaryRole), request.url));
      }

      if (pathname === "/pharmacy-admin" || pathname.startsWith("/pharmacy-admin/")) {
        const allowed = hasAnyRole(roles, ["PHARMACY_ADMIN", "SUPER_ADMIN", "TENANT_ADMIN"]);
        if (!allowed) {
          const redirectUrl = new URL(getPharmacyHome(primaryRole), request.url);
          redirectUrl.searchParams.set("access_denied", "pharmacy_admin_only");
          return NextResponse.redirect(redirectUrl);
        }
      }

      if (pathname === "/superintendent" || pathname.startsWith("/superintendent/")) {
        const allowed = hasAnyRole(roles, ["SUPERINTENDENT_PHARMACIST", "SUPER_ADMIN", "PHARMACY_ADMIN", "TENANT_ADMIN"]);
        if (!allowed) {
          const redirectUrl = new URL(getPharmacyHome(primaryRole), request.url);
          redirectUrl.searchParams.set("access_denied", "superintendent_pharmacist_only");
          return NextResponse.redirect(redirectUrl);
        }
      }

      if (
        pathname === "/pharmacy-finance" ||
        pathname.startsWith("/pharmacy-finance/") ||
        pathname === "/finances"
      ) {
        const allowed = hasAnyRole(roles, ["PHARMACY_FINANCE", "SUPER_ADMIN", "PHARMACY_ADMIN", "TENANT_ADMIN"]);
        if (!allowed) {
          const redirectUrl = new URL(getPharmacyHome(primaryRole), request.url);
          redirectUrl.searchParams.set("access_denied", "pharmacy_finance_only");
          return NextResponse.redirect(redirectUrl);
        }
      }

      const dispensaryRoutes = [
        "/dispensary",
        "/pos",
        "/verify",
        "/fulfillment",
        "/controlled-drugs",
        "/inventory",
      ];
      const isDispensaryRoute =
        dispensaryRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
        pathname.startsWith("/dispensary/");

      if (isDispensaryRoute) {
        const allowed = hasAnyRole(roles, ["PHARMACIST", "SUPER_ADMIN", "PHARMACY_ADMIN", "TENANT_ADMIN", "SUPERINTENDENT_PHARMACIST"]);
        if (!allowed) {
          const redirectUrl = new URL(getPharmacyHome(primaryRole), request.url);
          redirectUrl.searchParams.set("access_denied", "dispensary_counter_only");
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  } catch {
    // fallthrough — let backend handle verification downstream
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|favicon.ico|brand).*)"],
};


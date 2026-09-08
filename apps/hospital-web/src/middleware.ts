import { NextResponse, type NextRequest } from "next/server";

const publicPaths = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/register",
  "/forgot-password",
  "/onboard",
  "/api/public",
];

const isPublicPath = (pathname: string): boolean =>
  publicPaths.some((path) => pathname.startsWith(path)) || pathname === "/";

const CLINICAL_HATS = new Set([
  "SUPER_ADMIN",
  "HOSPITAL_ADMIN",
  "TENANT_ADMIN",
  "DOCTOR",
  "NURSE",
  "HOSPITAL_FINANCE",
  "RECORD_CLERK",
  "RECORDS_CLERK",
  "PATIENT",
]);

const PHARMACY_HATS = new Set([
  "PHARMACY_ADMIN",
  "PHARMACIST",
  "SUPERINTENDENT_PHARMACIST",
  "PHARMACY_FINANCE",
]);

const normalizeRole = (r?: string | null): string =>
  String(r || "")
    .trim()
    .toUpperCase()
    .replace(/RECORDS_CLERK/g, "RECORD_CLERK");

const resolveRoleList = (payload: Record<string, unknown>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  const push = (raw: unknown) => {
    if (raw === null || raw === undefined) return;
    const r = normalizeRole(String(raw));
    if (!r || seen.has(r)) return;
    seen.add(r);
    result.push(r);
  };
  const rolesField = payload.roles;
  if (Array.isArray(rolesField)) rolesField.forEach(push);
  push(payload.role);
  push(payload.primary_role);
  return result;
};

const hasAnyRole = (roles: string[], expected: Set<string>): boolean =>
  roles.some((r) => expected.has(r));

const pickPrimary = (roles: string[]): string => {
  if (!roles.length) return "";
  const order = [
    "SUPER_ADMIN",
    "HOSPITAL_ADMIN",
    "TENANT_ADMIN",
    "DOCTOR",
    "NURSE",
    "HOSPITAL_FINANCE",
    "RECORD_CLERK",
    "PHARMACY_ADMIN",
    "SUPERINTENDENT_PHARMACIST",
    "PHARMACIST",
    "PHARMACY_FINANCE",
    "PATIENT",
  ];
  for (const o of order) if (roles.includes(o)) return o;
  return roles[0];
};

const getRoleDefaultPath = (r: string) => {
  switch (r) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "HOSPITAL_ADMIN":
    case "TENANT_ADMIN":
      return "/hospital-admin";
    case "DOCTOR":
      return "/doctor/queue";
    case "NURSE":
      return "/nurse";
    case "HOSPITAL_FINANCE":
      return "/hospital-finance";
    case "RECORD_CLERK":
    case "RECORDS_CLERK":
      return "/reception";
    case "PHARMACY_ADMIN":
      return "/pharmacy-admin";
    case "SUPERINTENDENT_PHARMACIST":
      return "/superintendent";
    case "PHARMACIST":
      return "/dispensary";
    case "PHARMACY_FINANCE":
      return "/pharmacy-finance";
    case "PATIENT":
      return "/dashboard";
    default:
      return "/doctor";
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

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const target = new URL(request.url);
    target.pathname = pathname.replace(/^\/admin/, "/super-admin");
    return NextResponse.redirect(target, 307);
  }

  if (isPublicPath(pathname)) {
    if (request.nextUrl.searchParams.get("logout") === "true") {
      const response = NextResponse.next();
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    const originalUrl = new URL(request.url);
    loginUrl.searchParams.set("returnUrl", originalUrl.pathname + originalUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson) as Record<string, unknown>;
      const roles = resolveRoleList(payload);
      const primaryRole = pickPrimary(roles);
      const hasClinicalHat = roles.includes("SUPER_ADMIN") || hasAnyRole(roles, CLINICAL_HATS);
      const hasPharmacyHat = hasAnyRole(roles, PHARMACY_HATS);
      const purePharmacy = hasPharmacyHat && !hasClinicalHat;

      if (pathname === "/") {
        if (purePharmacy) {
          const pharmacyBase = (process.env.NEXT_PUBLIC_PHARMACY_POS_URL || "http://localhost:3001").replace(/\/$/, "");
          const target = primaryRole === "PHARMACIST" ? `${pharmacyBase}/dispensary` : `${pharmacyBase}/pharmacy-admin`;
          return NextResponse.redirect(target, 307);
        }
        return NextResponse.redirect(new URL(getRoleDefaultPath(primaryRole), request.url), 307);
      }

      if (roles.includes("SUPER_ADMIN")) {
        if (
          pathname.startsWith("/doctor") ||
          pathname.startsWith("/nurse") ||
          pathname.startsWith("/consultations") ||
          pathname.startsWith("/triage") ||
          pathname.startsWith("/reception")
        ) {
          const redirectUrl = new URL("/super-admin", request.url);
          redirectUrl.searchParams.set("zero_phi", "clinical_records_blocked");
          return NextResponse.redirect(redirectUrl, 307);
        }
      }

      if (!roles.includes("SUPER_ADMIN") && pathname.startsWith("/super-admin")) {
        const dest = getRoleDefaultPath(primaryRole);
        const redirectUrl = new URL(dest, request.url);
        redirectUrl.searchParams.set("access_denied", "super_admin_governance_restricted");
        return NextResponse.redirect(redirectUrl, 307);
      }

      const onlyDoctor = roles.includes("DOCTOR") && !roles.includes("HOSPITAL_ADMIN") && !roles.includes("HOSPITAL_FINANCE") && !roles.includes("TENANT_ADMIN") && !roles.includes("SUPER_ADMIN");
      if (onlyDoctor) {
        if (pathname.startsWith("/hospital-admin") || pathname.startsWith("/hospital-finance")) {
          const redirectUrl = new URL("/doctor", request.url);
          redirectUrl.searchParams.set("access_denied", "governance_or_finance_restricted");
          return NextResponse.redirect(redirectUrl, 307);
        }
      }

      const onlyClerk = roles.includes("RECORD_CLERK") && !roles.includes("DOCTOR") && !roles.includes("HOSPITAL_ADMIN") && !roles.includes("TENANT_ADMIN") && !roles.includes("SUPER_ADMIN");
      if (onlyClerk) {
        if (pathname.startsWith("/doctor")) {
          const redirectUrl = new URL("/reception", request.url);
          redirectUrl.searchParams.set("access_denied", "clerk_role_restricted_doctor");
          return NextResponse.redirect(redirectUrl, 307);
        }
      }

      const onlyNurse = roles.includes("NURSE") && !roles.includes("DOCTOR") && !roles.includes("HOSPITAL_ADMIN") && !roles.includes("HOSPITAL_FINANCE") && !roles.includes("TENANT_ADMIN") && !roles.includes("SUPER_ADMIN");
      if (onlyNurse) {
        if (
          pathname.startsWith("/hospital-admin") ||
          pathname.startsWith("/hospital-finance") ||
          pathname.startsWith("/doctor")
        ) {
          const redirectUrl = new URL("/nurse", request.url);
          redirectUrl.searchParams.set("access_denied", "role_restricted");
          return NextResponse.redirect(redirectUrl, 307);
        }
      }

      const onlyHospitalFinance = roles.includes("HOSPITAL_FINANCE") && !roles.includes("DOCTOR") && !roles.includes("NURSE") && !roles.includes("HOSPITAL_ADMIN") && !roles.includes("TENANT_ADMIN") && !roles.includes("SUPER_ADMIN");
      if (onlyHospitalFinance) {
        if (
          pathname.startsWith("/doctor") ||
          pathname.startsWith("/nurse") ||
          pathname.startsWith("/consultations") ||
          pathname.startsWith("/triage") ||
          pathname.startsWith("/patients")
        ) {
          const redirectUrl = new URL("/hospital-finance", request.url);
          redirectUrl.searchParams.set("zero_phi", "clinical_records_restricted");
          return NextResponse.redirect(redirectUrl, 307);
        }
      }

      if (purePharmacy) {
        const isRestrictedClinicalRoute =
          pathname.startsWith("/doctor") ||
          pathname.startsWith("/nurse") ||
          pathname.startsWith("/consultations") ||
          pathname.startsWith("/triage") ||
          pathname.startsWith("/patients") ||
          pathname.startsWith("/reception") ||
          pathname.startsWith("/clinical") ||
          pathname.startsWith("/hospital-admin") ||
          pathname.startsWith("/hospital-finance") ||
          pathname.startsWith("/super-admin");

        if (isRestrictedClinicalRoute) {
          const pharmacyBase = (process.env.NEXT_PUBLIC_PHARMACY_POS_URL || "http://localhost:3001").replace(/\/$/, "");
          const pharmacyTarget = roles.includes("PHARMACIST") ? `${pharmacyBase}/dispensary` : `${pharmacyBase}/pharmacy-admin`;
          return NextResponse.redirect(pharmacyTarget, 307);
        }
      }
    }
  } catch {
    // Token malformed or not parseable at edge — backend route guards will enforce
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png|favicon.ico|brand).*)"],
};


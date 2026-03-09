export function assertDashboardAdmin(req: Request) {
  const expected = process.env.DASHBOARD_ADMIN_KEY || "admin123";
  if (!expected) {
    return { ok: false as const, status: 500, message: "Server misconfigured." };
  }

  const got = req.headers.get("x-admin-key");
  if (!got || got !== expected) {
    return { ok: false as const, status: 401, message: "Unauthorized." };
  }

  return { ok: true as const };
}

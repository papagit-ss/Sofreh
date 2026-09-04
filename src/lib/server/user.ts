import type { NextRequest } from "next/server";

/**
 * شناسه کاربر از هدر x-user-id (تولیدشده در کلاینت و ذخیره‌شده در localStorage).
 * در آینده با auth واقعی (OTP / گوگل) جایگزین می‌شود، بدون تغییر در بقیه لایه‌ها.
 */
export function getUserId(req: NextRequest | Request): string {
  const h = req.headers.get("x-user-id");
  if (h && /^[a-zA-Z0-9_-]{6,64}$/.test(h)) return h;
  return "anonymous";
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

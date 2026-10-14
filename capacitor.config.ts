import type { CapacitorConfig } from "@capacitor/cli";

/**
 * پوسته اندروید «سفره» (نسخه آزمایشی)
 * اپ اصلی روی سرور اجرا می‌شود؛ این پوسته در اولین اجرا آدرس سرور را
 * از کاربر می‌گیرد (مثلاً آی‌پی کامپیوتر در وای‌فای خانه) و به آن وصل می‌شود.
 */
const config: CapacitorConfig = {
  appId: "ir.parasis.sofreh",
  appName: "سفره",
  webDir: "www",
  server: {
    cleartext: true,
    androidScheme: "http",
  },
};

export default config;

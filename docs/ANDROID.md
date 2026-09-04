# مسیر تبدیل به اپ اندروید

معماری پروژه از ابتدا برای این کار آماده شده:

## چرا آماده است؟
- **API-first**: تمام منطق (تطبیق مواد، لیست خرید، برنامه‌ریز منو، سشن آشپزی) در `src/app/api/*` است و UI فقط از این APIها استفاده می‌کند. اپ نیتیو می‌تواند مستقیم به همین endpointها وصل شود.
- **شناسه کاربر بدون لاگین**: کلاینت یک `x-user-id` تولید و در `localStorage` نگه می‌دارد (`src/lib/api-client.ts`). در اپ اندروید همین کار با SharedPreferences یا Capacitor Preferences انجام می‌شود. بعداً با OTP/Google Sign-in جایگزین می‌شود بدون تغییر در لایه‌های دیگر.
- **PWA**: `public/manifest.json` + viewport-fit + safe-area. با **Bubblewrap / TWA** می‌توان همین وب‌اپ را به APK/AAB تبدیل کرد.
- **Mobile-first UI**: max-width 512px، دکمه‌های بزرگ، Bottom Navigation، Bottom Sheetها، حالت آشپزی تمام‌صفحه با Wake Lock.

## گزینه‌ها
1. **TWA (سریع‌ترین)**: `npx @bubblewrap/cli init --manifest https://<domain>/manifest.json` → build → انتشار در بازار/گوگل‌پلی.
2. **Capacitor (دسترسی نیتیو)**: `npm i @capacitor/core @capacitor/android` و اشاره `server.url` به دامنه؛ برای نوتیفیکیشن تایمر از `@capacitor/local-notifications` و برای Wake Lock از `@capacitor-community/keep-awake` استفاده کنید.
3. **نیتیو کامل (Kotlin/Compose)**: تایپ‌های DTO در `src/lib/types.ts` قرارداد API است.

## اتصال فروشگاه‌ها
در `src/lib/stores.ts` اینترفیس `StoreAdapter` تعریف شده. برای هر فروشگاه (دیجی‌کالا جت، اسنپ مارکت، اکالا) یک adapter سمت سرور اضافه کنید که `createCart(items)` را پیاده کند و `enabled: true` شود. جدول `store_orders` snapshot سفارش‌ها را نگه می‌دارد.

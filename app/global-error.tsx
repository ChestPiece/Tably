"use client";

// Last resort when the root layout itself fails: no providers or app CSS are available here.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeContent: "center", minHeight: "100dvh", gap: 16, textAlign: "center", background: "#F6F3EB", color: "#1E2A5A" }}>
        <p>Something went wrong. Please try again.</p>
        <p lang="ar" dir="rtl">حدث خطأ. حاول مجدداً.</p>
        <button onClick={reset} style={{ minHeight: 48, padding: "0 24px", borderRadius: 8, border: 0, background: "#1E2A5A", color: "#F6F3EB" }}>
          Try again / حاول مجدداً
        </button>
      </body>
    </html>
  );
}

import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-content-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl">This page does not exist</h1>
      <p className="text-text-2">
        <span lang="ar">هذه الصفحة غير موجودة</span>
      </p>
      <Link href="/" className="mx-auto underline underline-offset-4">
        Tably home
      </Link>
    </main>
  );
}

"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { staffClient } from "@/lib/supabase/browser";

/** Re-fetch the owner page's server data when orders or visits change (debounced 1s). */
export function useLiveRefresh(rid: string) {
  const router = useRouter();
  useEffect(() => {
    const sb = staffClient();
    let timer: number | undefined;
    const kick = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 1000);
    };
    const filter = `restaurant_id=eq.${rid}`;
    const ch = sb
      .channel(`owner-${rid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter }, kick)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      sb.removeChannel(ch);
    };
  }, [rid, router]);
}

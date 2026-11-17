"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

// Guests are anonymous users with their own storage key, so a staff
// session in the same browser (cookie-based) never collides with it.
let client: SupabaseClient | undefined;
export function guestClient() {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storageKey: "cb-guest", persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export async function ensureGuestSession() {
  const sb = guestClient();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return anon.session;
}

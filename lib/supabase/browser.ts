"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export const staffClient = () => createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

// Login accepts a short username ("anasowner") or a full email.
export const toEmail = (login: string) => {
  const v = login.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@chestbest.test`;
};

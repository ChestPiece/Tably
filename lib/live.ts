// Apply one Supabase realtime change to a local list instead of refetching everything.
// Payload rows carry the table's own columns only, so fields the list added (order_lines,
// item_options) survive an UPDATE by merging over the old row.
export type Change<T> = { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Partial<T>; old: Partial<T> };

/** `keep` decides whether a row still belongs (e.g. unresolved requests, open visits). */
export function applyChange<T extends { id: string }>(list: T[], p: Change<T>, keep: (row: T) => boolean = () => true): T[] {
  const id = (p.eventType === "DELETE" ? p.old.id : p.new.id) as string | undefined;
  if (!id) return list;
  const i = list.findIndex((r) => r.id === id);
  if (p.eventType === "DELETE") return i < 0 ? list : list.filter((r) => r.id !== id);
  const row = { ...(i < 0 ? {} : list[i]), ...p.new } as T;
  if (!keep(row)) return i < 0 ? list : list.filter((r) => r.id !== id);
  if (i < 0) return [...list, row];
  const next = list.slice();
  next[i] = row;
  return next;
}

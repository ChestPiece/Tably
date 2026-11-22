export type DishDraft = { name: string; price: string; cost: string; category: string };

const BULLET = /^(?:[-*•·]|\d+[.)])\s+/;
// The price is the last number on the line, after a space, a separator or a currency sign.
const PRICED = /^(.*?\S)(?:\s+|\s*[-–—:|=$£€₹]\s*)([0-9٠-٩][0-9٠-٩.,٫]*)$/;
const TRAILING = /(?:\s*(?:[-–—:|=$£€₹]|\b[A-Z]{3}|\bRs\.?|\bDhs?\.?))+$/;

/**
 * A pasted menu -> dish rows. Accepts spreadsheet rows (name, price, cost split by tabs)
 * or plain lines like "Chai - 80", "Lassi PKR 150". A line with no price is a section
 * header: it becomes the category for the lines under it. Prices stay as typed text;
 * the caller validates them with parseMinor.
 */
export function parseDishes(text: string): DishDraft[] {
  const rows: DishDraft[] = [];
  let category = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(BULLET, "");
    if (!line) continue;
    if (line.includes("\t")) {
      const [name = "", price = "", cost = ""] = line.split("\t").map((c) => c.trim());
      if (name) rows.push({ name, price: clean(price), cost: clean(cost), category });
      continue;
    }
    const m = PRICED.exec(line);
    if (!m) {
      category = line.replace(/[\s:]+$/, "");
      continue;
    }
    rows.push({ name: m[1].replace(TRAILING, "").trim() || m[1], price: clean(m[2]), cost: "", category });
  }
  return rows;
}

// "1,200" -> "1200"; a decimal comma ("12,5") is left for parseMinor.
const clean = (p: string) => p.replace(/,(?=\d{3}(?:\D|$))/g, "").replace(/[.,٫]$/, "");

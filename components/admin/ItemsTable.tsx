"use client";
import { Arch } from "@/components/app/arch";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/lib/i18n";
import { pick, type MenuItem } from "@/lib/types";
import { useVenue } from "@/lib/venue";
import { cn } from "@/lib/utils";

type Props = {
  items: MenuItem[];
  busyId: string;
  selected?: string | null;
  catName: (id: string) => string;
  onEdit: (i: MenuItem) => void;
  onToggle: (i: MenuItem) => void;
};

const th = "border-b pe-5 pb-3 text-start text-sm font-medium whitespace-nowrap text-muted-foreground first:ps-3 last:pe-3";
const td = "border-b py-2.5 pe-5 align-middle first:ps-3 last:pe-3";
const opt = "max-[900px]:hidden";

// Arch thumb, or an empty arch so rows keep their rhythm.
const Thumb = ({ src }: { src: string | null }) =>
  src ? <Arch src={src} alt="" width={36} height={44} /> : <span aria-hidden className="block h-11 w-9 shrink-0 rounded-arch bg-muted" />;

export function ItemsTable({ items, busyId, selected, catName, onEdit, onToggle }: Props) {
  const { lang, t } = useLang();
  const { money } = useVenue();
  const name = (i: MenuItem) => pick(lang, i.name, i.name_ar);
  // The name is the row's button; its ::after covers the row, the switch sits above it.
  const names = (i: MenuItem) => (
    <span className="min-w-0">
      <button
        type="button"
        aria-current={selected === i.id || undefined}
        aria-label={`${t("edit")}: ${name(i)}`}
        onClick={() => onEdit(i)}
        className="block max-w-full truncate text-start font-medium outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
      >
        {name(i)}
      </button>
      <span className="block truncate text-sm text-muted-foreground" dir={lang === "ar" ? "ltr" : "rtl"}>
        {lang === "ar" ? i.name : i.name_ar}
      </span>
    </span>
  );
  const toggle = (i: MenuItem) => (
    <Switch className="relative z-10" checked={i.available} disabled={busyId === i.id} onCheckedChange={() => onToggle(i)} aria-label={`${name(i)} ${t("availableSuffix")}`} />
  );
  const price = (i: MenuItem) => <span className="whitespace-nowrap tabular-nums">{money(i.price_fils)}</span>;

  return (
    <>
      <div className="overflow-x-auto max-sm:hidden">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr>
              <th className={th}>{t("colItem")}</th>
              <th className={`${th} ${opt}`}>{t("categoryLabel")}</th>
              <th className={th}>{t("colPrice")}</th>
              <th className={th}>{t("colAvailable")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={cn("relative hover:bg-muted/60", selected === i.id && "bg-muted")}>
                <td className={td}>
                  <span className="flex items-center gap-3">
                    <Thumb src={i.image_url} />
                    {names(i)}
                  </span>
                </td>
                <td className={`${td} ${opt} text-muted-foreground`}>{catName(i.category_id)}</td>
                <td className={td}>{price(i)}</td>
                <td className={td}>{toggle(i)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="border-t sm:hidden">
        {items.map((i) => (
          <li key={i.id} className="relative flex items-center gap-3 border-b py-3">
            <Thumb src={i.image_url} />
            <span className="flex min-w-0 flex-1 flex-col">
              {names(i)}
              <span className="text-sm">{price(i)}</span>
            </span>
            {toggle(i)}
          </li>
        ))}
      </ul>
    </>
  );
}

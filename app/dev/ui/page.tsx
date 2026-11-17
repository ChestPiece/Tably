import { notFound } from "next/navigation";
import { UiPreview } from "./preview";

export const dynamic = "force-dynamic";

// Development only: every shared component in light and dark.
export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <div className="grid lg:grid-cols-2">
      <div className="bg-background text-foreground"><UiPreview /></div>
      <div className="dark bg-background text-foreground"><UiPreview /></div>
    </div>
  );
}

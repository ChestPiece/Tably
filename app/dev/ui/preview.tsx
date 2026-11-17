"use client";
import { Inbox, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Arch } from "@/components/app/arch";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { StatusTag } from "@/components/app/status-badge";
import { BrandLockup, BrandMark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLang } from "@/lib/i18n";
import type { OrderStatus } from "@/lib/types";

const statuses: OrderStatus[] = ["received", "preparing", "ready", "served", "cancelled"];
const h = "text-sm font-medium text-text-2";

export function UiPreview() {
  const { lang } = useLang();
  const [qty, setQty] = useState(2);
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(true);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-4">
      <h1 className="font-display text-3xl font-bold">Shared components</h1>
      <section className="flex flex-wrap items-center gap-4">
        <BrandLockup order="en-first" />
        <BrandLockup order="ar-first" size="sm" />
        <BrandMark className="size-10 text-primary" />
      </section>
      <p className={h}>Buttons</p>
      <section className="flex flex-wrap items-center gap-2">
        {(["default", "secondary", "ghost", "link", "destructive"] as const).map((v) => (
          <Button key={v} variant={v}>{v}</Button>
        ))}
        <Button size="sm">sm</Button>
        <Button size="xs">xs</Button>
        <Button size="icon" variant="ghost" aria-label="Delete"><Trash2 /></Button>
      </section>
      <p className={h}>Button states: hover, focus, pressed (forced), disabled</p>
      <section className="flex flex-wrap items-center gap-2">
        <Button className="opacity-90">hover</Button>
        <Button className="ring-2 ring-ring ring-offset-2 ring-offset-background">focus</Button>
        <Button className="scale-[.98]">pressed</Button>
        <Button disabled>disabled</Button>
        <Button variant="secondary" className="bg-muted">hover</Button>
        <Button variant="secondary" disabled>disabled</Button>
      </section>
      <p className={h}>Fields: rest, hover, focus, invalid, disabled</p>
      <section className="grid gap-2">
        <Input placeholder="Rest" aria-label="Rest" />
        <Input placeholder="Hover (forced)" aria-label="Hover" className="border-muted-foreground" />
        <Input placeholder="Focus (forced)" aria-label="Focus" className="ring-2 ring-ring ring-offset-1 ring-offset-background" />
        <Input defaultValue="Invalid" aria-invalid aria-label="Invalid" />
        <Input placeholder="Disabled" disabled aria-label="Disabled" />
        <Input size="sm" placeholder="Owner size (h-10)" aria-label="Small" />
        <Textarea placeholder="Textarea" aria-label="Textarea" />
        <Select>
          <SelectTrigger className="w-full" aria-label="Select"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent><SelectItem value="a">Option A</SelectItem><SelectItem value="b">Option B</SelectItem></SelectContent>
        </Select>
        <RadioGroup defaultValue="a" className="flex gap-4" aria-label="Radio">
          <label className="flex items-center gap-2"><RadioGroupItem value="a" />A</label>
          <label className="flex items-center gap-2"><RadioGroupItem value="b" />B</label>
        </RadioGroup>
      </section>
      <p className={h}>Switch, tabs, segmented, stepper</p>
      <section className="flex flex-wrap items-center gap-4">
        <Switch label="Accepting orders" checked={on} onCheckedChange={setOn} />
        <Switch aria-label="Off" />
        <Switch aria-label="Disabled" disabled />
        <QuantityStepper value={qty} min={1} onChange={(v) => setQty(v || 1)} labels={{ decrease: "Less", increase: "More", remove: "Remove" }} />
        <QuantityStepper filled value={qty} min={1} onChange={(v) => setQty(v || 1)} labels={{ decrease: "Less", increase: "More" }} />
      </section>
      <Tabs defaultValue="a">
        <TabsList variant="underline">
          <TabsTrigger value="a">Burgers</TabsTrigger>
          <TabsTrigger value="b">Sides</TabsTrigger>
          <TabsTrigger value="c">Drinks</TabsTrigger>
        </TabsList>
      </Tabs>
      <ToggleGroup type="single" variant="segmented" defaultValue="today" aria-label="Range">
        <ToggleGroupItem value="today">Today</ToggleGroupItem>
        <ToggleGroupItem value="week">7 days</ToggleGroupItem>
        <ToggleGroupItem value="month">30 days</ToggleGroupItem>
      </ToggleGroup>
      <p className={h}>Status, badge, arch</p>
      <section className="flex flex-wrap items-center gap-4">
        {statuses.map((s) => <StatusTag key={s} status={s} lang={lang} />)}
        <StatusTag status="preparing" late />
        {(["default", "secondary", "destructive", "outline"] as const).map((v) => <Badge key={v} variant={v}>{v}</Badge>)}
        <Arch src="/icon.svg" alt="Arch frame" width={72} height={88} />
      </section>
      <Table>
        <TableHeader><TableRow><TableHead>Dish</TableHead><TableHead className="text-end">Price</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow><TableCell>Smash burger</TableCell><TableCell className="text-end">AED 38.00</TableCell></TableRow>
          <TableRow><TableCell>Fries</TableCell><TableCell className="text-end">AED 14.00</TableCell></TableRow>
        </TableBody>
      </Table>
      <section className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setOpen(true)}>Responsive sheet</Button>
        <ConfirmAction
          tone="destructive"
          trigger={<Button variant="destructive">Confirm action</Button>}
          title="Cancel this order?" description="The guest is told right away."
          confirmLabel="Cancel order" cancelLabel="Keep it"
          onConfirm={() => new Promise<void>((r) => setTimeout(r, 1000))}
        />
        <Button variant="secondary" onClick={() => toast("Order sent")}>Toast</Button>
      </section>
      <Skeleton className="h-10 w-full" />
      <EmptyState icon={Inbox} title="No orders yet" body="New orders show up here the moment a guest sends one." action={<Button>Refresh</Button>} />
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Your order" description="Review before sending."
        footer={<Button className="w-full" onClick={() => setOpen(false)}>Send to kitchen</Button>}>
        {Array.from({ length: 12 }, (_, i) => <p key={i} className="border-b py-3">Line {i + 1}</p>)}
      </ResponsiveSheet>
    </main>
  );
}

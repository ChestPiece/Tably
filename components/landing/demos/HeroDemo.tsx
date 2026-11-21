"use client";
import { Plus } from "lucide-react";
import { Bar, Button, Collapse, Fly, Roll, Phone, Stage, States, Window, type Act, type Rect } from "../kit";
import { TicketFace } from "./Ticket";
import "./tably.css";
import "./hero.css";

// Hero: a guest orders on their phone and the ticket lands on the kitchen
// board. A system story told across two devices (copied from the gold
// device-pair framing, with the chip flight from subscriptions).
//
// Beats: tap Add on the burger and the lemonade (the order bar rises), tap
// Send to the kitchen, a ticket swells out of the button and lands at the top
// of the Line, the count rolls. Then the kitchen works it: Start preparing,
// Mark ready, it leaves for the pass, and the pass serves its oldest ticket.
// That is also the reset: everything the story added leaves by its own cause,
// and the pass ends looking as it began (its tickets are placeholder).
//
// Real words: the two dishes and prices, Send to the kitchen, Line, the new
// ticket and its button. Everything else is bars.

type Pay = "idle" | "busy" | "done";
type S = {
  burger: number;
  lemon: number;
  bar: boolean;
  pay: Pay;
  fly: null | { from: Rect; to: Rect; go: boolean };
  t4: "none" | "open" | "landed";
  cooking: boolean;
  out: boolean;
  passNew: boolean;
  served: boolean;
};

const START: S = { burger: 0, lemon: 0, bar: false, pay: "idle", fly: null, t4: "none", cooking: false, out: false, passNew: false, served: false };
const POSTER: S = { ...START, burger: 1, lemon: 1, bar: true, pay: "done", t4: "landed" };

const LINES: [number, string][] = [
  [1, "Smash burger"],
  [1, "Mint lemonade"],
];

async function script(a: Act<S>) {
  await a.wait(400);
  a.mark("add");
  await a.click({ at: "add-burger", x: 0.5, y: 0.5 });
  await a.set({ burger: 1, bar: true });
  await a.wait(500);
  await a.click({ at: "add-lemon", x: 0.5, y: 0.5 });
  await a.set({ lemon: 1 });
  await a.wait(800);

  a.mark("send");
  await a.click({ at: "send", x: 0.5, y: 0.5 });
  await a.set({ pay: "busy" });
  await a.wait(450);
  // The ticket buds off the button at the ticket's own shape, then swells
  // into its place at the top of the Line while the space opens under it
  const list = a.rect("line", { layout: true });
  const t = a.rect("t4", { layout: true });
  const b = a.rect("send", { layout: true });
  const h = b.height;
  const w = (h * t.width) / t.height;
  const from = { x: b.x + b.width / 2 - w / 2, y: b.y, width: w, height: h };
  const to = { x: t.x, y: list.y, width: t.width, height: t.height };
  await a.set({ fly: { from, to, go: false } });
  await a.wait(180);
  await a.set((s) => ({ t4: "open", fly: { ...s.fly!, go: true } }));
  await a.wait(1150);
  a.mark("landed");
  await a.set({ fly: null, t4: "landed", pay: "done" });
  await a.wait(1500);

  // The kitchen picks it up; the guest's order bar folds away, cart sent
  a.mark("cook");
  await a.click({ at: "t4-btn", x: 0.5, y: 0.5 });
  await a.set({ cooking: true });
  await a.wait(350);
  await a.set({ bar: false, burger: 0, lemon: 0 });
  await a.wait(700);
  await a.snap({ pay: "idle" });
  await a.wait(800);

  a.mark("ready");
  await a.click({ at: "t4-btn", x: 0.5, y: 0.5 });
  await a.set({ out: true, passNew: true });
  await a.wait(1300);
  await a.set({ served: true });
  await a.wait(400);
  await a.move(a.layout === "compact" ? { x: 320, y: 300 } : { x: 300, y: 360 });
  await a.wait(100);
  // Same frame as the start: the pass's tickets are placeholders, so the
  // swap is invisible; the closed slot resets unseen
  await a.snap({ t4: "none", cooking: false, out: false, passNew: false, served: false });
  await a.wait(200);
}

function Dish({ name, price, desc, qty, target }: { name: string; price: string; desc: [number, number]; qty: number; target: string }) {
  return (
    <div className="hd-dish">
      <span className="hd-dish__name">
        <span className="td-display">{name}</span>
        <span className="td-leader" />
        <span className="hd-dish__price td-num">{price}</span>
      </span>
      <span className="hd-dish__desc">
        <Bar w={desc[0]} h={9} tone={2} />
        <Bar w={desc[1]} h={9} tone={2} />
      </span>
      <span className="hd-dish__ctl">
        <States
          align="end"
          value={qty ? "qty" : "add"}
          states={{
            add: (
              <Button className="hd-add" data-target={target} icon={<Plus size={20} strokeWidth={2} aria-hidden />}>
                Add
              </Button>
            ),
            qty: (
              <span className="hd-step">
                <span aria-hidden>−</span>
                <b className="td-num">{qty || 1}</b>
                <span aria-hidden>+</span>
              </span>
            ),
          }}
        />
      </span>
    </div>
  );
}

export default function HeroDemo() {
  return (
    <Stage<S>
      width={600}
      height={584}
      compact={{ below: 440, width: 358, height: 770 }}
      initial={START}
      poster={POSTER}
      script={script}
      cursor={{ style: "touch", at: { wide: { x: 300, y: 360 }, compact: { x: 320, y: 300 } } }}
      className="hd"
    >
      {(s, _rect, layout) => {
        const total = (s.burger ? 32 : 0) + (s.lemon ? 16 : 0);
        const line = 1 + (s.t4 === "landed" && !s.out ? 1 : 0);
        const pass = 1 + (s.passNew ? 1 : 0) - (s.served ? 1 : 0);
        return (
          <>
            <div className="hd-mask">
            <Window title="Kitchen" className="hd-board td-dark">
              <div className="hd-cols">
                <aside className="hd-aside" />
                <section className="hd-line">
                  <header className="hd-col-head">
                    Line <Roll className="hd-col-count">{String(line)}</Roll>
                  </header>
                  <div className="hd-list" data-target="line">
                    <Collapse open={s.t4 !== "none" && !s.out} reveal="clip">
                      <div className="hd-slot" data-landed={s.t4 === "landed" || undefined}>
                        <TicketFace
                          target="t4"
                          num="4"
                          meta="#118 · Sara"
                          age="now"
                          lines={LINES}
                          state={s.cooking ? "cooking" : "new"}
                          button={
                            <Button data-target="t4-btn">{s.cooking ? "Mark ready" : "Start preparing"}</Button>
                          }
                        />
                      </div>
                    </Collapse>
                    <TicketFace num="9" age="6 min" lines={null} state="cooking" button={<Button>Mark ready</Button>} />
                  </div>
                </section>
                <section className="hd-pass">
                  <header className="hd-col-head">
                    <span className="lbl-long">At the pass</span><span className="lbl-short">Pass</span> <Roll className="hd-col-count">{String(pass)}</Roll>
                  </header>
                  <div className="hd-list">
                    <Collapse open={s.passNew} reveal="clip">
                      <div className="hd-slot">
                        <TicketFace num="" lines={null} state="ready" />
                      </div>
                    </Collapse>
                    <Collapse open={!s.served} reveal="clip">
                      <div className="hd-slot">
                        <TicketFace num="" lines={null} state="ready" />
                      </div>
                    </Collapse>
                    <TicketFace num="" lines={null} state="ready" />
                  </div>
                </section>
              </div>
            </Window>
            </div>

            <Phone width={layout === "compact" ? 232 : 224} frame="pro" className="hd-phone">
              <div className="hd-screen td-light">
                <div className="hd-venue">
                  <span className="td-display">ChestBest</span>
                  <Bar w={70} h={9} tone={2} />
                </div>
                <div className="hd-tabs">
                  <Bar w={64} h={10} tone={4} />
                  <Bar w={52} h={10} tone={2} />
                  <Bar w={70} h={10} tone={2} />
                </div>
                <div className="hd-menu">
                  <h3 className="hd-cat td-display">Burgers</h3>
                  <Dish name="Smash burger" price="AED 32.00" desc={[250, 170]} qty={s.burger} target="add-burger" />
                  <Dish name="Mint lemonade" price="AED 16.00" desc={[230, 120]} qty={s.lemon} target="add-lemon" />
                  <div className="hd-dish">
                    <span className="hd-dish__name">
                      <Bar w={150} h={14} tone={3} />
                      <Bar w={70} h={12} tone={2} style={{ marginInlineStart: "auto" }} />
                    </span>
                    <span className="hd-dish__desc">
                      <Bar w={240} h={9} tone={2} />
                    </span>
                  </div>
                </div>
                <div className="hd-bar" data-open={s.bar || undefined}>
                  <span className="hd-send" data-target="send" data-state={s.pay}>
                    <States
                      value={s.pay}
                      states={{
                        idle: (
                          <span className="hd-send__row">
                            <span>Send to the kitchen</span>
                            <Roll className="td-num">{`AED ${total}.00`}</Roll>
                          </span>
                        ),
                        busy: <span className="hd-send__row hd-send__row--center">Sending…</span>,
                        done: <span className="hd-send__row hd-send__row--center">Sent · the kitchen has it</span>,
                      }}
                    />
                  </span>
                </div>
              </div>
            </Phone>

            {s.fly && (
              <Fly from={s.fly.from} to={s.fly.to} go={s.fly.go} held duration={950}>
                <div className="hd-flyer td-dark" style={{ width: s.fly.from.width, height: s.fly.from.height }}>
                  <div style={{ width: s.fly.to.width, transform: `scale(${s.fly.from.width / s.fly.to.width})`, transformOrigin: "0 0" }}>
                    <TicketFace num="4" meta="#118 · Sara" age="now" lines={LINES} state="new" button={<span className="ss-button">Start preparing</span>} />
                  </div>
                </div>
              </Fly>
            )}
          </>
        );
      }}
    </Stage>
  );
}

"use client";
import { BellRing } from "lucide-react";
import { Button, Collapse, Roll, Stage, Window, type Act } from "../kit";
import { TicketFace } from "./Ticket";
import "./tably.css";
import "./hero.css";
import "./board.css";

// Team: the kitchen board running a few minutes of service. A ticket is
// started and marked ready, a guest calls a waiter and staff answer, the pass
// serves its oldest plate. The reset is a cause too: a new order arrives at
// the top of the Line looking exactly as the first frame did.

type S = { cook: boolean; out: boolean; call: boolean; passNew: boolean; served: boolean };
const START: S = { cook: false, out: false, call: false, passNew: false, served: false };
const POSTER: S = { ...START, cook: true, call: true };

const LINES: [number, string][] = [
  [2, "Chicken shawarma"],
  [1, "Fattoush"],
];

const T12 = (state: "new" | "cooking", button?: React.ReactNode, target?: string) => (
  <TicketFace target={target} num="12" meta="#121 · Omar" age="1 min" lines={LINES} state={state} button={button} />
);

async function script(a: Act<S>) {
  await a.wait(1000);
  a.mark("start");
  await a.click({ at: "t12-btn", x: 0.5, y: 0.5 });
  await a.set({ cook: true });
  await a.wait(1100);

  a.mark("call");
  await a.set({ call: true });
  await a.wait(1400);
  await a.click({ at: "call-btn", x: 0.86, y: 0.7 });
  await a.set({ call: false });
  await a.wait(900);

  a.mark("ready");
  await a.click({ at: "t12-btn", x: 0.5, y: 0.5 });
  await a.set({ out: true, passNew: true });
  await a.wait(1400);
  await a.set({ served: true });
  await a.wait(1100);

  // A new order for table 12 lands at the top of the Line: the first frame again
  a.mark("next");
  await a.move(a.layout === "compact" ? { x: 300, y: 320 } : { x: 420, y: 380 });
  // The pass placeholders look alike, so swapping which one is shown is unseen
  await a.snap({ passNew: false, served: false });
  await a.set({ out: false, cook: false });
  await a.wait(1400);
}

export default function BoardDemo() {
  return (
    <Stage<S>
      width={480}
      height={420}
      compact={{ below: 440, width: 358, height: 350 }}
      initial={START}
      poster={POSTER}
      script={script}
      cursor={{ kind: "pointer", at: { wide: { x: 420, y: 380 }, compact: { x: 300, y: 320 } } }}
      className="bd"
    >
      {(s) => {
        const line = s.out ? 2 : 3;
        const pass = 3 + (s.passNew ? 1 : 0) - (s.served ? 1 : 0);
        return (
          <div className="bd-mask">
          <Window title="Kitchen" className="bd-board td-dark">
            <Collapse open={s.call} reveal="clip">
              <div className="bd-call">
                <BellRing size={18} strokeWidth={1.75} aria-hidden />
                <span className="bd-call__text">
                  <b>Table 6</b> is calling a waiter
                </span>
                <Button className="bd-call__btn" data-target="call-btn">
                  On my way
                </Button>
              </div>
            </Collapse>
            <div className="bd-cols">
              <section className="bd-col">
                <header className="bd-col-head">
                  Line <Roll className="bd-col-count">{String(line)}</Roll>
                </header>
                <div className="bd-list">
                  <Collapse open={!s.out} reveal="clip">
                    <div className="bd-slot">
                      {T12(
                        s.cook ? "cooking" : "new",
                        <Button data-target="t12-btn">{s.cook ? "Mark ready" : "Start preparing"}</Button>,
                      )}
                    </div>
                  </Collapse>
                  <TicketFace num="9" age="6 min" lines={null} state="cooking" />
                  <TicketFace num="7" age="9 min" lines={null} state="cooking" />
                </div>
              </section>
              <section className="bd-col bd-pass">
                <header className="bd-col-head">
                  <span className="lbl-long">At the pass</span><span className="lbl-short">Pass</span> <Roll className="bd-col-count">{String(pass)}</Roll>
                </header>
                <div className="bd-list">
                  <Collapse open={s.passNew} reveal="clip">
                    <div className="bd-slot">
                      <TicketFace num="" lines={null} state="ready" />
                    </div>
                  </Collapse>
                  <TicketFace num="" lines={null} state="ready" />
                  <TicketFace num="" lines={null} state="ready" />
                  <Collapse open={!s.served} reveal="clip">
                    <div className="bd-slot">
                      <TicketFace num="" lines={null} state="ready" />
                    </div>
                  </Collapse>
                </div>
              </section>
            </div>
          </Window>
          </div>
        );
      }}
    </Stage>
  );
}

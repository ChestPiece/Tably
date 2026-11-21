"use client";
import { Plus } from "lucide-react";
import { Bar, Button, Phone, Roll, Stage, States, Toggle, Window, type Act } from "../kit";
import "./tably.css";
import "./hero.css";
import "./menu.css";

// Your restaurant: the owner changes the menu and the guest's phone follows.
// Copied from the gold table-edit (a price edited in place, its effect a beat
// later) with the device-pair framing (the phone straddles the window's
// margin, never its figures).
//
// Beats: the owner double-clicks the burger's price, types 34.00, commits, and
// the phone's price rolls to match. Then the lemonade's Available switch goes
// off and the phone marks it sold out. Plays once in view; the poster is the
// result (new price, lemonade sold out).
//
// Real words: the four dishes and their prices in the table, the two dishes on
// the phone. Everything else is bars.

type S = { edit: boolean; sel: boolean; val: string; price: number; wash: boolean; lemon: boolean };

const START: S = { edit: false, sel: false, val: "", price: 32, wash: false, lemon: true };
const POSTER: S = { ...START, price: 34, lemon: false };

const ROWS = [
  { name: "Smash burger", cat: "Burgers", price: 32 },
  { name: "Mint lemonade", cat: "Drinks", price: 16 },
  { name: "Chicken shawarma", cat: "Wraps", price: 28 },
  { name: "Fattoush", cat: "Salads", price: 22 },
];
const aed = (n: number) => `AED ${n}.00`;

async function script(a: Act<S>) {
  await a.wait(700);
  a.mark("open");
  // Aim at the cell's empty left side so the cursor never sits on the figure
  await a.click({ at: "price", x: 0.12, y: 0.5 }, { double: true });
  a.put({ edit: true, sel: true, val: "32.00" });
  // Off the digits while typing, as a hand does once it goes to the keys
  await a.move({ at: "price", x: -0.4, y: 1.6 }, { duration: 450 });
  await a.wait(200);
  a.mark("type");
  a.put({ sel: false, val: "" });
  await a.type("val", "34.00", { interval: 80 });
  await a.wait(350);
  a.mark("commit");
  a.put({ edit: false, price: 34, wash: true });
  await a.wait(900);
  a.put({ wash: false });
  await a.wait(500);

  a.mark("sold-out");
  await a.click({ at: "lemon-switch", x: 0.5, y: 0.5 });
  await a.set({ lemon: false });
  await a.wait(2400);
}

export default function MenuEditDemo() {
  return (
    <Stage<S>
      width={880}
      height={560}
      compact={{ below: 640, width: 358, height: 806 }}
      initial={START}
      poster={POSTER}
      script={script}
      play="once"
      cursor={{ at: { wide: { x: 560, y: 400 }, compact: { x: 330, y: 300 } } }}
      className="md"
    >
      {(s, _rect, layout) => (
        <>
          <div className="md-mask">
          <Window title="Menu" className="md-admin td-light">
            <div className="md-body">
              <div className="md-top">
                <span className="md-title td-display">Menu</span>
                <span className="md-tabs">
                  <Bar w={56} h={8} tone={4} />
                  <Bar w={48} h={8} tone={2} />
                  <Bar w={44} h={8} tone={2} />
                </span>
                <Button className="md-add" icon={<Plus size={16} strokeWidth={2} aria-hidden />}>
                  Add dish
                </Button>
              </div>
              <div className="md-row md-row--head">
                <span>Dish</span>
                <span className="md-cat">Category</span>
                <span className="md-num">Price</span>
                <span className="md-avail">Available</span>
              </div>
              {ROWS.map((r, i) => (
                <div key={r.name} className="md-row">
                  <span className="md-dish">
                    <span className="md-thumb" aria-hidden />
                    <span className="md-name">{r.name}</span>
                  </span>
                  <span className="md-cat">{r.cat}</span>
                  {i === 0 ? (
                    <span className="md-num md-cell" data-target="price" data-edit={s.edit || undefined} data-wash={s.wash || undefined}>
                      <span className="md-ring" />
                      <span className="md-text">
                        {s.edit ? (
                          <>
                            {s.sel ? <span className="md-sel" data-on>{s.val}</span> : s.val}
                            <span className="md-caret" data-hide={s.sel || undefined} key={s.val} />
                          </>
                        ) : (
                          `${s.price}.00`
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="md-num">{r.price}.00</span>
                  )}
                  <span className="md-avail">
                    <Toggle on={i === 1 ? s.lemon : true} data-target={i === 1 ? "lemon-switch" : undefined} />
                  </span>
                </div>
              ))}
              <div className="md-row">
                <span className="md-dish">
                  <span className="md-thumb" aria-hidden />
                  <Bar w={110} h={9} tone={3} />
                </span>
                <span className="md-cat"><Bar w={44} h={8} tone={2} /></span>
                <span className="md-num"><Bar w={36} h={8} tone={2} /></span>
                <span className="md-avail"><Toggle on /></span>
              </div>
            </div>
          </Window>
          </div>

          <PhoneMenu price={s.price} lemon={s.lemon} compact={layout === "compact"} />
        </>
      )}
    </Stage>
  );
}

function PhoneMenu({ price, lemon, compact }: { price: number; lemon: boolean; compact: boolean }) {
  return (
    <Phone width={compact ? 232 : 224} frame="pro" className="md-phone">
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
          <h3 className="hd-cat td-display">Popular</h3>
          <div className="hd-dish">
            <span className="hd-dish__name">
              <span className="td-display">Smash burger</span>
              <span className="td-leader" />
              <Roll className="hd-dish__price td-num" delay={250}>{aed(price)}</Roll>
            </span>
            <span className="hd-dish__desc">
              <Bar w={compact ? 200 : 250} h={9} tone={2} />
              <Bar w={170} h={9} tone={2} />
            </span>
          </div>
          <div className="hd-dish md-dish--phone" data-off={lemon ? undefined : ""}>
            <span className="hd-dish__name">
              <span className="td-display">Mint lemonade</span>
              <span className="td-leader" />
              <span className="hd-dish__price td-num">{aed(16)}</span>
            </span>
            <span className="hd-dish__desc">
              <Bar w={compact ? 190 : 230} h={9} tone={2} />
            </span>
            <span className="hd-dish__ctl">
              <States
                align="end"
                value={lemon ? "on" : "off"}
                states={{
                  on: <span className="md-avail-note">Available</span>,
                  off: <span className="md-avail-note md-avail-note--off">Sold out</span>,
                }}
              />
            </span>
          </div>
        </div>
      </div>
    </Phone>
  );
}

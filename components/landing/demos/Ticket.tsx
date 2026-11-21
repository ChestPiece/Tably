import type { ReactNode } from "react";
import { Bar } from "../kit/window";

// One kitchen ticket, drawn the way components/staff/OrderCard.tsx draws it:
// table number in the display face, order number and guest, age, the lines,
// then the step button. `lines` as null draws placeholder bars (a ticket the
// story isn't about).
export function TicketFace({
  num,
  meta,
  age,
  lines,
  note,
  state,
  button,
  target,
}: {
  num: string;
  meta?: string;
  age?: string;
  lines: [number, string][] | null;
  note?: string;
  state: "new" | "cooking" | "ready";
  button?: ReactNode;
  target?: string;
}) {
  return (
    <div className="td-ticket" data-state={state} data-target={target}>
      <div className="td-ticket__head">
        <span className="td-ticket__num td-display td-num">{num}</span>
        {meta ? <span className="td-ticket__meta td-num">{meta}</span> : <Bar w={64} h={6} tone={3} style={{ flex: "none" }} />}
        {age ? <span className="td-ticket__age td-num">{age}</span> : <Bar w={22} h={6} tone={2} style={{ marginInlineStart: "auto" }} />}
      </div>
      <div className="td-ticket__lines">
        {lines
          ? lines.map(([q, name]) => (
              <span key={name} className="td-ticket__line">
                <b className="td-num">{q}</b>
                <span>{name}</span>
              </span>
            ))
          : [92, 70, 80].map((w, i) => (
              <span key={i} className="td-ticket__line" style={{ height: 20 }}>
                <Bar w={8} h={8} r={2} tone={4} />
                <Bar w={w} h={6} tone={3} />
              </span>
            ))}
      </div>
      {note && <span className="td-ticket__note">{note}</span>}
      {button && (
        <div className="td-ticket__acts">
          {button}
          <span className="td-ticket__cancel">Cancel</span>
        </div>
      )}
    </div>
  );
}

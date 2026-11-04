// How notifications look. Anything can post one with notify({ title, body,
// level, icon, action }); replace this mod to restyle them all. Click to
// run its action (e.g. go to the agent) and dismiss it. Swipe it sideways
// (trackpad) or drag it sideways to dismiss it without running the action.

import { View, div, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, closeOverlay, run, theme } from "herdr";

const DOT = { error: "blocked", warning: "working", success: "done", info: "accent" };
// How far it must travel sideways to be dismissed; less springs back.
const AWAY = 90;

export default class Toast extends View {
  init() {
    this.dx = 0;
    this.press = null; // pointer x where a drag started
    this.gone = false;
  }

  dismiss() {
    if (this.gone) return;
    this.gone = true;
    closeOverlay(props()?.overlay);
  }

  // A drag or swipe that ended: far enough goes, otherwise it springs back.
  settle(cx) {
    if (Math.abs(this.dx) > AWAY) return this.dismiss();
    this.dx = 0;
    cx.notify();
  }

  render(cx) {
    const t = theme();
    const p = props() ?? {};
    return div()
      .id("toast-track")
      .size_full()
      .overflow_hidden()
      .on_scroll_wheel((e, cx) => {
        if (e.touch_phase === "ended" || e.touch_phase === "cancelled") return this.settle(cx);
        if (Math.abs(e.delta.x) <= Math.abs(e.delta.y)) return;
        this.dx += e.delta.x;
        cx.notify();
      })
      .on_mouse_down("left", (e) => { this.press = e.position.x - this.dx; })
      .on_mouse_move((e, cx) => {
        if (this.press === null) return;
        // Released somewhere else (off the toast): treat it as let go there.
        if (e.pressed_button === undefined && this.sawButton) { this.press = null; return this.settle(cx); }
        if (e.pressed_button) this.sawButton = true;
        this.dx = e.position.x - this.press;
        cx.notify();
      })
      .on_hover((hovered, cx) => {
        if (!hovered && this.press !== null) { this.press = null; this.settle(cx); }
      })
      .on_mouse_up("left", (_e, cx) => {
        const dragged = this.press !== null && Math.abs(this.dx) > 4;
        this.press = null;
        if (dragged) return this.settle(cx);
        this.dx = 0;
        if (p.action?.name) run(p.action.name, p.action.args ?? {});
        this.dismiss();
      })
      .child(
        h_flex()
          .id("toast")
          .relative()
          .left(this.dx)
          .opacity(Math.max(0.15, 1 - Math.abs(this.dx) / (AWAY * 2)))
          .size_full()
          .px(18)
          .gap(12)
          .items_center()
          .bg(t.popover)
          .cursor_pointer()
          .hover((s) => s.bg(t.hover))
          .child(p.icon ? image(p.icon).w(18).h(18).flex_none() : div().size(8).rounded(4).flex_none().bg(t[DOT[p.level] ?? "accent"]))
          .child(
            v_flex()
              .flex_1()
              .overflow_hidden()
              .child(div().truncate().font_semibold().text_size(13).text_color(t.foreground).child(p.title ?? ""))
              .when(Boolean(p.body), (el) => el.child(div().truncate().text_size(12).text_color(t.muted).child(p.body ?? ""))),
          ),
      );
  }
}

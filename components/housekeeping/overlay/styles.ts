// The host is a light-DOM element, so its own styles are set inline (CSSOM) with
// !important to beat page CSS. Everything else lives in the closed shadow root.
export const HOST_CSS = [
  "all: initial",
  "position: fixed",
  "top: 0",
  "left: 0",
  "width: 0",
  "height: 0",
  "display: block",
  "overflow: visible",
  "pointer-events: none",
  "z-index: 2147483647",
].map((d) => `${d} !important;`).join(" ");

/** Applied to the page while sonar is active: hide the native cursor everywhere. */
export const PAGE_CSS = `
html, html *, html *::before, html *::after { cursor: none !important; }
[data-sonar-exempt], [data-sonar-exempt] *, [data-devinspector], [data-devinspector] * { cursor: auto !important; }
`;

const EASE = "cubic-bezier(.2,.8,.2,1)";
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const SANS = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;

export const OVERLAY_CSS = `
* { box-sizing: border-box; }
[hidden] { display: none !important; }

.box {
  position: fixed;
  top: 0; left: 0; width: 0; height: 0;
  box-sizing: border-box;
  border: 2px solid var(--tone, #3b82f6);
  border-radius: 3px;
  background: color-mix(in srgb, var(--tone, #3b82f6) 7%, transparent);
  box-shadow: 0 0 0 1px rgba(0,0,0,.35);
  pointer-events: none;
  z-index: 2147483646;
  opacity: 0;
  transition:
    top 120ms ${EASE}, left 120ms ${EASE}, width 120ms ${EASE}, height 120ms ${EASE},
    opacity 80ms linear, background-color 120ms linear;
}
.box.on { opacity: 1; }
.box.locked { background: color-mix(in srgb, var(--tone, #3b82f6) 15%, transparent); }
.box.inspector { border-style: dotted; background: transparent; }
.box.inspector.locked { background: color-mix(in srgb, var(--tone, #3b82f6) 10%, transparent); }
.box.snap { transition: opacity 80ms linear; }

.chip {
  position: absolute;
  left: -2px;
  bottom: calc(100% + 4px);
  max-width: min(560px, calc(100vw - 16px));
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--tone, #c2410c);
  color: #fff;
  font: 500 11px/16px ${MONO};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 1px 2px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06);
}
.chip.inside { bottom: auto; top: 2px; left: 2px; }
.chip-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.chip-icon { flex-shrink: 0; display: block; }
.chip-icon.off { opacity: .28; }
.chip-ways { display: flex; flex-shrink: 0; align-items: center; gap: 2px; color: #fed7aa; }
.chip-cmd { font: 600 10px/10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin-left: 2px; }
.chip-cmd.off { opacity: .28; }
.chip:empty { display: none; }

.dot, .cross {
  position: fixed;
  top: 0; left: 0;
  pointer-events: none;
  z-index: 2147483647;
  will-change: transform;
  transition: opacity 80ms linear;
}
.dot {
  width: 6px; height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 0 1px #fff, 0 0 0 2px rgba(0,0,0,.35);
}
.cross { width: 14px; height: 14px; margin: -7px 0 0 -7px; overflow: visible; }
.cross .halo { stroke: rgba(255,255,255,.9); stroke-width: 3; }
.cross .line { stroke: #1d4ed8; stroke-width: 1; }
.cursor-off .dot, .cursor-off .cross, .cursor-off .hair { opacity: 0; }
.hair { position: fixed; top: 0; left: 0; display: none; background: rgba(37,99,235,.55); pointer-events: none; }
.hair.h { width: 100vw; height: 1px; }
.hair.v { width: 1px; height: 100vh; }
.inspector .hair { display: block; }
.inspector .dot { display: none; }

.panel {
  position: fixed;
  pointer-events: none;
  z-index: 2147483645;
  background: #111;
  color: #d1d5db;
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
}

.debug {
  left: 12px; bottom: 12px;
  max-width: min(460px, calc(100vw - 24px));
  padding: 8px 10px;
  border-radius: 8px;
  font: 11px/1.5 ${MONO};
}
.debug.dodge { bottom: auto; top: 12px; }
.debug[hidden] { display: none; }
.debug .crumb { color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.debug .keys { color: #6b7280; margin-bottom: 4px; }
.debug .row { display: flex; gap: 12px; white-space: nowrap; }
.debug .sel { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.debug .verdict { color: #9ca3af; }
.debug .verdict.hit { color: #60a5fa; }
.debug .meta { color: #6b7280; margin-top: 4px; }

.pill {
  right: 12px; bottom: 12px;
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font: 500 11px/14px ${SANS};
  color: #e5e7eb;
}
.pill.dodge { bottom: auto; top: 12px; }
.pill .led { width: 7px; height: 7px; border-radius: 50%; background: #6b7280; }
.pill .led.ok { background: #22c55e; }
.pill .sep { color: #6b7280; }

.pin {
  position: fixed;
  top: 0; left: 0;
  width: 28px; height: 28px;
  border-radius: 14px 14px 14px 3px;
  background: #3b82f6;
  color: #fff;
  font: 600 12px/28px ${SANS};
  text-align: center;
  box-shadow: 0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,.35);
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  z-index: 2147483647;
  transform-origin: 0 100%;
}
.pin.note { background: #6b7280; }
.pin img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block; pointer-events: none; }
.pin .badge {
  position: absolute;
  top: -5px; right: -5px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2px #fff;
  display: none;
  place-items: center;
}
.pin.done .badge { display: grid; }

.popover {
  position: fixed;
  top: 0; left: 0;
  width: 340px;
  z-index: 2147483647;
  pointer-events: auto;
  cursor: auto;
  display: flex;
  flex-direction: column;
  background: #26262b;
  color: #e5e7eb;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 4px;
  box-shadow: 0 16px 40px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.25);
  font: 13px/1.45 ${SANS};
}
.pc-head { display: flex; align-items: center; gap: 4px; padding: 3px 2px 5px 4px; }
.pc-grip { display: grid; place-items: center; width: 24px; height: 24px; color: #8b8f98; cursor: grab; touch-action: none; }
.pc-grip:active { cursor: grabbing; }
.pc-title { font: 600 13px/16px ${SANS}; color: #f3f4f6; user-select: none; }
.pc-head .chip-ways { gap: 4px; color: #93c5fd; margin-left: 10px; }
.pc-head .chip-ways .chip-icon { width: 12px; height: 12px; }
.pc-head .chip-ways .chip-cmd { font-size: 12px; line-height: 12px; }
.pc-grow2 { flex: 1; }
.pc-kebab { display: grid; place-items: center; width: 26px; height: 26px; border: 0; border-radius: 8px; background: transparent; color: #cbd5e1; cursor: pointer; }
.pc-kebab:hover { background: rgba(255,255,255,.08); color: #fff; }
.pc-menu { position: absolute; top: 32px; right: 6px; z-index: 5; min-width: 188px; background: #2b2b31; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; box-shadow: 0 10px 28px rgba(0,0,0,.4); padding: 4px; }
.pc-menu[hidden] { display: none; }
.pc-mi { display: flex; width: 100%; align-items: center; gap: 8px; padding: 7px 10px; border: 0; border-radius: 8px; background: none; font: 500 13px/16px ${SANS}; color: #e5e7eb; cursor: pointer; text-align: left; }
.pc-mi:hover { background: rgba(255,255,255,.07); }
.pc-mi svg { color: #9ca3af; flex-shrink: 0; }
.pc-mi-on { margin-left: auto; color: #2563eb; font-weight: 700; }
.pc-inner {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px;
  background: #1f1f1f;
  color: #e5e7eb;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,.2);
}
.pc-meta { color: #9ca3af; font: 11px/16px ${MONO}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: -4px 0 8px; }
.pc-meta:empty { display: none; }
.pc-size { position: absolute; right: 2px; bottom: 2px; width: 16px; height: 16px; cursor: nwse-resize; touch-action: none; }
.pc-crumb { display: none; color: #8b8b8b; font: 11px/16px ${MONO}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 8px; }
.pc-ways { display: flex; margin-bottom: 6px; }
.pc-ways .chip-ways { gap: 4px; }
.pc-ways .chip-icon { width: 12px; height: 12px; }
.pc-ways .chip-cmd { font-size: 12px; line-height: 12px; }
.pc-text { display: block; width: 100%; min-height: 40px; padding: 0; border: 0; outline: 0; resize: none; background: transparent; color: #f3f4f6; font: inherit; cursor: text; }
.pc-text::placeholder { color: #6b7280; }
.pc-note { white-space: pre-wrap; overflow-wrap: anywhere; color: #f3f4f6; }
.popover.viewing .pc-compose { display: none; }
.pc-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.pc-check { display: inline-flex; align-items: center; gap: 6px; color: #d1d5db; font-size: 12px; cursor: pointer; user-select: none; }
.pc-check input { margin: 0; accent-color: #3b82f6; cursor: pointer; }
.pc-icon { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: #9ca3af; cursor: pointer; }
.pc-icon:hover { background: rgba(255,255,255,.06); color: #e5e7eb; }
.pc-icon.live { color: #f87171; }
.pc-session { margin-left: auto; max-width: 150px; padding: 3px 6px; border: 1px solid rgba(255,255,255,.08); border-radius: 6px; background: #2a2a2a; color: #d1d5db; font: 11px ${SANS}; cursor: pointer; }
.pc-session:disabled { color: #6b7280; cursor: default; }
.pc-actions { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.06); }
.pc-grow { flex: 1; }
.pc-link { padding: 4px 0; border: 0; background: transparent; color: #9ca3af; font: 12px ${SANS}; cursor: pointer; }
.pc-link:hover { color: #e5e7eb; }
.pc-primary { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 0; border-radius: 8px; background: #3b82f6; color: #fff; font: 600 12px/1 ${SANS}; cursor: pointer; }
.pc-primary:hover { background: #2563eb; }
.pc-primary kbd { font: 500 10px/1 ${SANS}; opacity: .75; }
`;

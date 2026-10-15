"use client";

import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

interface Opt {
  value: string;
  label: string;
  disabled: boolean;
}

/** What onChange receives (the parts of a change event the app uses). */
export interface SelectChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
}

/** The text of an option's children ("Texas", {s}, {name}{suffix}, …). */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** The <option> children (also inside fragments, arrays and <optgroup>). */
function collect(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  Children.forEach(children, (c) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean }>(c)) return;
    if (c.type === Fragment || c.type === "optgroup") {
      out.push(...collect(c.props.children));
      return;
    }
    if (c.type === "option") {
      const label = textOf(c.props.children);
      out.push({ value: c.props.value != null ? String(c.props.value) : label, label, disabled: !!c.props.disabled });
    }
  });
  return out;
}

/** classes that place the field (width, margins, grid / flex) go on the wrapper; the rest style the field itself */
const LAYOUT = /^(?:[a-z]+:)?(w-|max-w|min-w|flex-|flex$|shrink|grow|col-|row-|m[trblxy]?-|-m[trblxy]?-|self-|order-|hidden$|block$|inline)/;

type Props = {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: SelectChangeEvent) => void;
  onBlur?: () => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  id?: string;
  name?: string;
  title?: string;
  children?: ReactNode;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean | "true" | "false";
  required?: boolean;
  autoFocus?: boolean;
};

/**
 * The app's dropdown (same props as a <select> with <option> children): a field showing the chosen option and a
 * list exactly as wide as the field, drawn above everything (so cards and popups never cut it off).
 * Keyboard: ↑ ↓ to move, Enter / Space to choose, Esc to close, letters jump to an option.
 */
export function Select({ value, defaultValue, onChange, onBlur, className, style, disabled, id, name, title, children, autoFocus, ...aria }: Props) {
  const options = collect(children);
  const [inner, setInner] = useState(defaultValue != null ? String(defaultValue) : options[0]?.value ?? "");
  const current = value != null ? String(value) : inner;
  const chosen = options.find((o) => o.value === current) ?? (value == null ? undefined : options[0]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  const tokens = (className ?? "input").split(/\s+/).filter(Boolean);
  const wrapperClass = tokens.filter((t) => LAYOUT.test(t)).join(" ");
  const fieldClass = tokens.filter((t) => !LAYOUT.test(t)).join(" ");
  // size / margin styles place the field (wrapper); the others (padding, font, colour, …) style the field itself
  const wrapperStyle: CSSProperties = {};
  const fieldStyle: CSSProperties = {};
  for (const [k, v] of Object.entries(style ?? {})) {
    const to = /^(width|minWidth|maxWidth|flex|flexShrink|flexGrow|flexBasis|margin|marginTop|marginBottom|marginLeft|marginRight|alignSelf|gridColumn|display)$/.test(k) ? wrapperStyle : fieldStyle;
    (to as Record<string, unknown>)[k] = v;
  }

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const want = Math.min(280, options.length * 34 + 10);
    const up = below < want && above > below;
    setBox({ top: up ? r.top - 4 : r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.max(120, Math.min(280, up ? above : below)), up });
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const reflow = (e: Event) => {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return;
      place();
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
    };
  }, [open, place]);

  // the highlighted option in view
  useEffect(() => {
    if (open && active >= 0) listRef.current?.querySelector('[data-i="' + active + '"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active, box]);

  const choose = (o: Opt) => {
    if (o.disabled) return;
    setOpen(false);
    btnRef.current?.focus();
    if (o.value === current) return;
    if (value == null) setInner(o.value);
    onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } });
  };

  const openList = () => {
    if (disabled) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };

  const move = (step: number) => {
    let i = active;
    for (let n = 0; n < options.length; n++) {
      i = (i + step + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList();
      else move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) openList();
      else if (active >= 0) choose(options[active]);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      // type to jump to an option
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) {
        if (open) setActive(i);
        else choose(options[i]);
      }
    }
  };

  return (
    <div className={"relative " + wrapperClass} style={wrapperStyle}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        title={title ?? chosen?.label}
        disabled={disabled}
        autoFocus={autoFocus}
        className={fieldClass + " text-left flex items-center justify-between gap-2"}
        style={{ ...fieldStyle, width: "100%", cursor: disabled ? "not-allowed" : "pointer" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        {...aria}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      >
        <span className="truncate" style={{ minWidth: 0 }}>{chosen?.label ?? " "}</span>
        <Icon name="ChevronDown" size={14} className="shrink-0 text-ink-light" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {open &&
        box &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={aria["aria-label"]}
            className="rounded-lg border border-line py-1 overflow-y-auto select-list"
            style={{
              position: "fixed",
              left: box.left,
              width: box.width,
              top: box.up ? undefined : box.top,
              bottom: box.up ? window.innerHeight - box.top : undefined,
              maxHeight: box.maxHeight,
              zIndex: 2000,
              background: "var(--bg, #fff)",
              boxShadow: "0 10px 25px rgba(0,0,0,.12)",
            }}
          >
            {options.map((o, i) => {
              const sel = o.value === current;
              return (
                <li
                  key={o.value + "|" + i}
                  data-i={i}
                  role="option"
                  aria-selected={sel}
                  aria-disabled={o.disabled || undefined}
                  title={o.label}
                  className="px-3 py-1.5 text-sm truncate"
                  style={{
                    cursor: o.disabled ? "not-allowed" : "pointer",
                    opacity: o.disabled ? 0.45 : 1,
                    background: sel ? "var(--accent-soft)" : i === active ? "var(--bg-soft)" : undefined,
                    color: sel ? "var(--accent-strong)" : undefined,
                    fontWeight: sel ? 500 : undefined,
                  }}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                >
                  {o.label || " "}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}

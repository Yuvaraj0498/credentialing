"use client";

import { Select } from "@/components/Select";
import { useCities, useMasterList, withCurrent } from "@/lib/masterLists";

type Source = { publicToken?: string | null; isPublic?: boolean };
const opts = ({ publicToken, isPublic }: Source) => (publicToken !== undefined || isPublic ? { publicToken: publicToken ?? null, isPublic } : undefined);

/** State dropdown (Master Data → State): "Texas (TX)", stores the 2-letter code. */
export function StateSelect({
  value,
  onChange,
  placeholder = "— Select —",
  invalid,
  disabled,
  ariaLabel = "State",
  ...src
}: Source & { value: string; onChange: (code: string) => void; placeholder?: string; invalid?: boolean; disabled?: boolean; ariaLabel?: string }) {
  const states = useMasterList("state", opts(src));
  const list = withCurrent(
    states.map((s) => ({ value: s.value, label: s.label + " (" + s.value + ")" })),
    value
  );
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={"input" + (invalid ? " input-error" : "")} disabled={disabled} aria-label={ariaLabel}>
      <option value="">{placeholder}</option>
      {list.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </Select>
  );
}

/** City dropdown (Master Data → City): the cities of the chosen state; locked until a state is chosen. */
export function CitySelect({
  state,
  value,
  onChange,
  invalid,
  disabled,
  ariaLabel = "City",
  ...src
}: Source & { state: string; value: string; onChange: (city: string) => void; invalid?: boolean; disabled?: boolean; ariaLabel?: string }) {
  const cities = useCities(state, opts(src));
  const list = withCurrent(cities, value);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={"input" + (invalid ? " input-error" : "")} disabled={disabled || !state} aria-label={ariaLabel}>
      <option value="">{state ? "— Select a city —" : "Pick a state first"}</option>
      {list.map((c) => (
        <option key={c.value} value={c.value}>{c.label}</option>
      ))}
    </Select>
  );
}

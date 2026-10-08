"use client";

import { useState } from "react";
import { AlertBox } from "@/components/AlertBox";
import { Icon } from "@/components/Icon";
import { Loading } from "@/components/AsyncState";
import { Modal } from "@/components/Modal";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/stores/toast";
import { useLocations } from "@/components/providers/shared";
import type { LocationItem, ProviderDetail } from "@/types/providers";

/** Prototype AssignProviderToLocationModal (L14314) → PUT /providers/{id}/assignment. */
export function AssignProviderToLocationModal({
  provider,
  locations: given,
  onSaved,
  onClose,
}: {
  provider: { id: number; firstName: string; lastName: string; locationId: number | null };
  /** Optional preloaded org locations (loaded on demand otherwise). */
  locations?: LocationItem[];
  onSaved: (p: ProviderDetail) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const loaded = useLocations(!given);
  const locations = given || loaded.data;
  const [locationId, setLocationId] = useState(provider.locationId ? String(provider.locationId) : "");
  const [busy, setBusy] = useState(false);
  const currentLocation = locations?.find((l) => l.id === provider.locationId);
  const loc = locationId ? locations?.find((l) => String(l.id) === locationId) : null;

  const save = async () => {
    setBusy(true);
    try {
      const p = await api.put<ProviderDetail>("/providers/" + provider.id + "/assignment", { locationId: locationId ? Number(locationId) : null });
      toast("Assigned " + provider.firstName + " " + provider.lastName + " to " + (loc?.name || "unassigned"));
      onSaved(p);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={"Assign Location: " + provider.firstName + " " + provider.lastName} subtitle="Link this provider to an organization practice location" onClose={onClose} maxWidth={520}>
      {!given && loaded.error ? (
        <div className="space-y-3">
          <AlertBox type="danger">{loaded.error}</AlertBox>
          <div className="flex justify-end">
            <button className="btn btn-secondary" onClick={loaded.reload}><Icon name="RefreshCw" size={13} /> Retry</button>
          </div>
        </div>
      ) : !locations ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          {currentLocation && (
            <div className="p-3 rounded flex items-center gap-2 text-xs flex-wrap" style={{ background: "var(--bg-soft)" }}>
              <Icon name="MapPin" size={12} className="text-ink-light" />
              <span className="text-ink-light">Currently at:</span>
              <span className="font-semibold">{currentLocation.name}</span>
              <span className="text-ink-faint">·</span>
              <span className="text-ink-light">{currentLocation.legalName || ""}</span>
            </div>
          )}
          <div>
            <label className="label">Assign to Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="input">
              <option value="">— Unassigned —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.legalName || "No legal name"} ({l.address ? l.address.split(",")[0] : ""})
                </option>
              ))}
            </select>
            {locations.length === 0 && <div className="text-[11px] text-ink-faint mt-1">No locations exist yet. Add one under Locations.</div>}
          </div>
          {loc && (
            <div className="p-3 rounded border border-line text-xs">
              <div className="font-semibold mb-1">{loc.name}</div>
              <div className="text-ink-light">{loc.legalName}</div>
              {loc.npi && <div className="text-ink-faint font-mono mt-1">NPI: {loc.npi}</div>}
              <div className="text-ink-light mt-1">{[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(", ")}</div>
              {loc.phone && <div className="text-ink-faint">{loc.phone}</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
            <button onClick={save} className="btn btn-primary" disabled={busy}>
              {busy ? <span className="loader" /> : <Icon name="Save" size={13} />} Update Assignment
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

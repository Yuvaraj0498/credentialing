"use client";

import { useState } from "react";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { PasswordInput } from "@/components/PasswordInput";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useToast } from "@/stores/toast";

/** Provider portal → Change Password (the key icon next to Sign out). */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!current) e.currentPassword = "Enter your current password";
    if (next.length < 8) e.newPassword = next ? "At least 8 characters" : "Enter a new password";
    else if (next === current) e.newPassword = "Choose a password different from the current one";
    if (!confirm) e.confirm = "Confirm the new password";
    else if (confirm !== next) e.confirm = "Passwords do not match";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: current, newPassword: next });
      toast("Password changed");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const clear = (k: string) => setErrors((x) => ({ ...x, [k]: "" }));

  return (
    <Modal title="Change Password" onClose={busy ? undefined : onClose} maxWidth={420}>
      <div className="space-y-3">
        <Field label="Current Password" required error={errors.currentPassword}>
          <PasswordInput value={current} onChange={(e) => { setCurrent(e.target.value); clear("currentPassword"); }} className="input" autoComplete="current-password" autoFocus />
        </Field>
        <Field label="New Password" required error={errors.newPassword} hint="At least 8 characters">
          <PasswordInput value={next} onChange={(e) => { setNext(e.target.value); clear("newPassword"); }} className="input" autoComplete="new-password" maxLength={100} />
        </Field>
        <Field label="Confirm New Password" required error={errors.confirm}>
          <PasswordInput value={confirm} onChange={(e) => { setConfirm(e.target.value); clear("confirm"); }} onKeyDown={(e) => e.key === "Enter" && save()} className="input" autoComplete="new-password" maxLength={100} />
        </Field>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={save} className="btn btn-primary" disabled={busy}>
            {busy ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="KeyRound" size={13} />} Change Password
          </button>
        </div>
      </div>
    </Modal>
  );
}

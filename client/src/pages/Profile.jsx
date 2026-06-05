import { useState } from "react";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Alert, Spinner } from "../components/ui.jsx";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [nameError, setNameError] = useState("");
  const [passError, setPassError] = useState("");

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    setNameError("");
    try {
      await api.put("/auth/profile", { name });
      await refreshUser();
      toast("Profile updated", "success");
    } catch (err) {
      setNameError(apiError(err));
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSavingPass(true);
    setPassError("");
    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast("Password updated", "success");
    } catch (err) {
      setPassError(apiError(err));
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-700 text-ink">Profile</h1>
        <p className="mt-1 text-muted">Update your account details.</p>
      </div>

      <form onSubmit={saveName} className="card space-y-4 p-6">
        <h2 className="font-600 text-ink">Display name</h2>
        {nameError && <Alert>{nameError}</Alert>}
        <div>
          <label className="label">Email</label>
          <input className="input bg-canvas" value={user?.email || ""} disabled />
        </div>
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={savingName}>
          {savingName ? <Spinner /> : "Save name"}
        </button>
      </form>

      <form onSubmit={savePassword} className="card space-y-4 p-6">
        <h2 className="font-600 text-ink">Change password</h2>
        {passError && <Alert>{passError}</Alert>}
        <div>
          <label className="label">Current password</label>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">New password</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={savingPass}>
          {savingPass ? <Spinner /> : "Update password"}
        </button>
      </form>
    </div>
  );
}

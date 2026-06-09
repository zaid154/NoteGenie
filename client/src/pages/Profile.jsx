// Profile page: user apni photo, naam, bio aur password update kar sakta hai,
// aur apne study stats (materials, quizzes, average score) dekh sakta hai.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  Alert,
  Spinner,
  Badge,
  PageHeader,
  Stats,
  SectionTitle,
} from "../components/ui.jsx";
import { IconCamera, IconTrash, IconCalendar } from "../components/icons.jsx";

const MAX_BIO = 280;

// Image ko ek chhote square (256x256) JPEG data URL me badalta hai.
// Isse photo halki rehti hai (free hosting/DB ke liye ideal) — koi file storage nahi chahiye.
function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Naam se initials banata hai (jaise "Zaid Khan" -> "ZK").
function initialsOf(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState("");

  const [stats, setStats] = useState(null);

  // user latest ho jaye (refresh ke baad) to form values sync karo.
  useEffect(() => {
    setName(user?.name || "");
    setBio(user?.bio || "");
  }, [user?.name, user?.bio]);

  // Page khulte hi documents + quiz analytics ek saath mangwao.
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [docsRes, statsRes] = await Promise.all([
          api.get("/documents"),
          api.get("/quiz/analytics/overview"),
        ]);
        if (ignore) return;
        setStats({
          materials: docsRes.data.documents?.length || 0,
          attempts: statsRes.data.totalAttempts || 0,
          avgScore: statsRes.data.avgScore || 0,
        });
      } catch {
        if (!ignore) setStats({ materials: 0, attempts: 0, avgScore: 0 });
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function onAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("Image is too large (max 8MB)", "error");
      return;
    }
    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeImage(file);
      await api.put("/auth/profile", { avatar: dataUrl });
      await refreshUser();
      toast("Photo updated", "success");
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    try {
      await api.put("/auth/profile", { avatar: "" });
      await refreshUser();
      toast("Photo removed", "success");
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    try {
      await api.put("/auth/profile", { name, bio });
      await refreshUser();
      toast("Profile updated", "success");
    } catch (err) {
      setProfileError(apiError(err));
    } finally {
      setSavingProfile(false);
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

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  const loadingStat = (
    <span className="skeleton inline-block h-7 w-12 align-middle" />
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Account" title="Your" accent="profile." />

      {/* ── Identity row: avatar + name + meta ─────────────── */}
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-lg border border-line bg-brand-600">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-700 text-white">
                {initialsOf(user?.name)}
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                <Spinner />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            title="Change photo"
            aria-label="Change photo"
            className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full border-2 border-canvas bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <IconCamera width={15} height={15} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-600 text-ink">{user?.name}</h2>
            <Badge color={user?.role === "admin" ? "amber" : "brand"}>
              {user?.role === "admin" ? "Admin" : "Member"}
            </Badge>
          </div>
          <p className="truncate text-sm text-muted">{user?.email}</p>
          {memberSince && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <IconCalendar width={14} height={14} />
              Joined {memberSince}
            </p>
          )}
        </div>

        {user?.avatar && (
          <button
            type="button"
            onClick={removeAvatar}
            disabled={uploadingAvatar}
            className="btn-ghost gap-2 text-sm"
          >
            <IconTrash width={16} height={16} /> Remove photo
          </button>
        )}
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <Stats
        cols={3}
        items={[
          { label: "Study materials", value: stats ? stats.materials : loadingStat },
          { label: "Quizzes attempted", value: stats ? stats.attempts : loadingStat },
          {
            label: "Average score",
            value: stats ? `${stats.avgScore}%` : loadingStat,
          },
        ]}
      />

      {/* ── Personal details (name + bio) ──────────────────── */}
      <div>
        <SectionTitle>Personal details</SectionTitle>
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          {profileError && <Alert>{profileError}</Alert>}
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
              maxLength={80}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Bio</label>
              <span className="text-xs text-muted">
                {bio.length}/{MAX_BIO}
              </span>
            </div>
            <textarea
              className="input min-h-[90px] resize-y"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="Tell us a little about yourself and what you're studying..."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? <Spinner /> : "Save changes"}
          </button>
        </form>
      </div>

      {/* ── Change password ────────────────────────────────── */}
      <div>
        <SectionTitle>Security</SectionTitle>
        <form onSubmit={savePassword} className="card space-y-4 p-6">
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
            <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
          </div>
          <button type="submit" className="btn-primary" disabled={savingPass}>
            {savingPass ? <Spinner /> : "Update password"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-muted">
        Back to{" "}
        <Link to="/app" className="text-brand-600 hover:underline">
          Dashboard
        </Link>
      </p>
    </div>
  );
}

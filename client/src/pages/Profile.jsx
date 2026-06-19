import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiError, setToken } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { passwordStrength } from "../components/FormField.jsx";
import {
  Alert,
  Spinner,
  Badge,
  PageHeader,
  StatCard,
  StatSkeleton,
  SectionTitle,
  UsageMeter,
  EmptyState,
} from "../components/ui.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";
import {
  IconCamera,
  IconTrash,
  IconCalendar,
  IconDoc,
  IconChart,
  IconCards,
  IconActivity,
  IconUpload,
  IconCoins,
  IconShield,
  IconChevronRight,
  IconMail,
} from "../components/icons.jsx";

const MAX_BIO = 280;

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

function initialsOf(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
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

  const [pageLoading, setPageLoading] = useState(true);
  const [materials, setMaterials] = useState(0);
  const [quizStats, setQuizStats] = useState({ totalAttempts: 0, avgScore: 0, recent: [] });
  const [dueCount, setDueCount] = useState(0);
  const [billing, setBilling] = useState(null);

  const [resendingVerify, setResendingVerify] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const passStrength = passwordStrength(newPassword);

  useEffect(() => {
    setName(user?.name || "");
    setBio(user?.bio || "");
  }, [user?.name, user?.bio]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setPageLoading(true);
      try {
        const [docsRes, statsRes, dueRes, billingRes] = await Promise.all([
          api.get("/documents"),
          api.get("/quiz/analytics/overview"),
          api.get("/documents/review/due"),
          api.get("/billing/status"),
        ]);
        if (ignore) return;
        setMaterials(docsRes.data.documents?.length || 0);
        setQuizStats({
          totalAttempts: statsRes.data.totalAttempts || 0,
          avgScore: statsRes.data.avgScore || 0,
          recent: statsRes.data.recent || [],
        });
        setDueCount(dueRes.data.count ?? dueRes.data.due?.length ?? 0);
        setBilling(billingRes.data);
      } catch {
        if (!ignore) {
          setMaterials(0);
          setQuizStats({ totalAttempts: 0, avgScore: 0, recent: [] });
          setDueCount(0);
        }
      } finally {
        if (!ignore) setPageLoading(false);
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

  async function resendVerification() {
    setResendingVerify(true);
    try {
      const { data } = await api.post("/auth/resend-verification");
      toast(data.message || "Verification OTP sent", "success");
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setResendingVerify(false);
    }
  }

  async function deleteAccount(e) {
    e.preventDefault();
    const ok = await confirm({
      title: "Delete your account?",
      message: "This permanently removes all your materials, quizzes, and data. This cannot be undone.",
      confirmText: "Delete account",
      danger: true,
    });
    if (!ok) return;
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await api.delete("/auth/account", { data: { password: deletePassword } });
      setToken(null);
      logout();
      toast("Account deleted", "success");
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(apiError(err));
    } finally {
      setDeletingAccount(false);
    }
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  const plan = user?.plan || billing?.plan || "free";
  const planExpiry = billing?.planExpiresAt || user?.planExpiresAt;
  const usage = billing?.usage;
  const verifyUrl = `/verify-email?email=${encodeURIComponent(user?.email || "")}`;

  const quickActions = [
    { to: "/upload", label: "Upload", icon: IconUpload },
    { to: "/analytics", label: "Analytics", icon: IconChart },
    { to: "/billing", label: "Billing", icon: IconCoins },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: IconShield }] : []),
    ...(!user?.emailVerified
      ? [{ to: verifyUrl, label: "Verify email", icon: IconMail, accent: true }]
      : []),
  ];

  if (pageLoading && !billing) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader title="Your profile" subtitle="Manage your account and study stats." />
        <StatSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        title="Your profile"
        subtitle="Manage your account, plan, and study progress."
        action={
          <Link to="/app" className="btn-ghost text-sm">
            ← Library
          </Link>
        }
      />

      {!user?.emailVerified && (
        <Alert type="warning">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Your email is not verified. Enter the OTP we sent to secure your account.</span>
            <Link to={verifyUrl} className="btn-outline py-1.5 text-xs">
              Enter OTP
            </Link>
          </div>
        </Alert>
      )}

      <StaggerContainer className="space-y-8">
        {/* Hero */}
        <StaggerItem>
          <div className="panel flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border border-line bg-indigo-600 ring-2 ring-indigo-100 dark:ring-indigo-900">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-indigo-700 text-3xl font-bold text-white">
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
                className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <IconCamera width={16} height={16} />
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
                <h2 className="text-2xl font-semibold text-ink">{user?.name}</h2>
                <Badge color={user?.role === "admin" ? "amber" : "brand"}>
                  {user?.role === "admin" ? "Admin" : "Member"}
                </Badge>
                <Badge color="brand">{plan}</Badge>
                <Badge color={user?.emailVerified ? "green" : "amber"}>
                  {user?.emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>
              <p className="mt-1 truncate text-sm text-muted">{user?.email}</p>
              {bio && <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-2">{bio}</p>}
              {memberSince && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <IconCalendar width={14} height={14} />
                  Joined {memberSince}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {quickActions.map(({ to, label, icon: Icon, accent }) => (
                  <Link
                    key={to}
                    to={to}
                    className={accent ? "btn-primary py-1.5 text-xs" : "btn-outline py-1.5 text-xs"}
                  >
                    <Icon width={14} height={14} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {user?.avatar && (
              <button
                type="button"
                onClick={removeAvatar}
                disabled={uploadingAvatar}
                className="btn-ghost shrink-0 gap-2 self-start text-sm"
              >
                <IconTrash width={16} height={16} /> Remove photo
              </button>
            )}
          </div>
        </StaggerItem>

        {/* Stats */}
        <StaggerItem>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pageLoading ? (
              <StatSkeleton count={4} />
            ) : (
              <>
                <StatCard icon={IconDoc} label="Study materials" numericValue={materials} color="indigo" />
                <StatCard
                  icon={IconChart}
                  label="Quizzes taken"
                  numericValue={quizStats.totalAttempts}
                  color="violet"
                />
                <StatCard
                  icon={IconActivity}
                  label="Average score"
                  value={`${quizStats.avgScore}%`}
                  color="emerald"
                />
                <StatCard
                  icon={IconCards}
                  label="Cards due"
                  numericValue={dueCount}
                  hint={dueCount > 0 ? "Ready for review" : "All caught up"}
                  color="amber"
                />
              </>
            )}
          </div>
        </StaggerItem>

        {/* Two columns */}
        <StaggerItem>
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left — forms */}
            <div className="space-y-8 lg:col-span-7">
              <div>
                <SectionTitle>Personal details</SectionTitle>
                <form onSubmit={saveProfile} className="rail-card space-y-4 p-6">
                  {profileError && <Alert>{profileError}</Alert>}
                  <div>
                    <label className="label">Email</label>
                    <input className="input bg-canvas" value={user?.email || ""} disabled />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {!user?.emailVerified && (
                        <>
                          <Link to={verifyUrl} className="btn-outline py-1 text-xs">
                            Enter OTP
                          </Link>
                          <button
                            type="button"
                            className="btn-outline py-1 text-xs"
                            onClick={resendVerification}
                            disabled={resendingVerify}
                          >
                            {resendingVerify ? <Spinner size={14} /> : "Resend OTP"}
                          </button>
                        </>
                      )}
                    </div>
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
                      className="input min-h-[100px] resize-y"
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

              <div>
                <SectionTitle>Security</SectionTitle>
                <form onSubmit={savePassword} className="rail-card space-y-4 p-6">
                  {passError && <Alert>{passError}</Alert>}
                  <div>
                    <label className="label">Current password</label>
                    <input
                      type="password"
                      className="input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
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
                      autoComplete="new-password"
                    />
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <span
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                passStrength.score >= i ? passStrength.color : "bg-line"
                              }`}
                            />
                          ))}
                        </div>
                        {passStrength.label && (
                          <p className="mt-1 text-xs text-muted">
                            Strength: <span className="text-ink">{passStrength.label}</span>
                          </p>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
                  </div>
                  <button type="submit" className="btn-primary" disabled={savingPass}>
                    {savingPass ? <Spinner /> : "Update password"}
                  </button>
                </form>
              </div>

              <div>
                <SectionTitle>Danger zone</SectionTitle>
                <form
                  onSubmit={deleteAccount}
                  className="rail-card space-y-4 border border-red-200 p-6 dark:border-red-900"
                >
                  <p className="text-sm text-muted">
                    Permanently delete your account and all associated data.
                  </p>
                  {deleteError && <Alert>{deleteError}</Alert>}
                  <div>
                    <label className="label">Confirm with password</label>
                    <input
                      type="password"
                      className="input"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-outline border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? <Spinner /> : "Delete account"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right — overview */}
            <div className="space-y-6 lg:col-span-5">
              <div className="panel space-y-4 p-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">Plan & usage</h3>
                  <Badge color="brand">{plan}</Badge>
                </div>
                {plan !== "free" && planExpiry && (
                  <p className="text-sm text-muted">Valid until {formatDate(planExpiry)}</p>
                )}
                {usage ? (
                  <div className="space-y-3">
                    <UsageMeter label="Documents" used={usage.used.documents} limit={usage.limits.documents} />
                    <UsageMeter label="Tutor messages" used={usage.used.tutorMessages} limit={usage.limits.tutorMessages} />
                    <UsageMeter label="Quizzes" used={usage.used.quizzes} limit={usage.limits.quizzes} />
                  </div>
                ) : (
                  <p className="text-sm text-muted">Usage data unavailable.</p>
                )}
                <Link
                  to={plan === "free" ? "/pricing" : "/billing"}
                  className="btn-primary inline-flex w-full justify-center text-sm"
                >
                  {plan === "free" ? "Upgrade plan" : "Manage billing"}
                </Link>
              </div>

              <div className="rail-card p-6">
                <SectionTitle
                  action={
                    quizStats.recent.length > 0 ? (
                      <Link to="/analytics" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        View all
                      </Link>
                    ) : null
                  }
                >
                  Recent quizzes
                </SectionTitle>
                {quizStats.recent.length === 0 ? (
                  <EmptyState
                    compact
                    icon={IconChart}
                    title="No quizzes yet"
                    subtitle="Generate a quiz from your materials."
                    action={
                      <Link to="/upload" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        Upload material
                      </Link>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-line">
                    {quizStats.recent.slice(0, 5).map((a) => (
                      <li key={a.id}>
                        <Link
                          to={a.quizId ? `/quiz/${a.quizId}` : "/analytics"}
                          className="flex items-center justify-between gap-3 py-3 transition hover:bg-ink/[0.02]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{a.title}</p>
                            <p className="text-xs text-muted">
                              {new Date(a.date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge color={a.percent >= 70 ? "green" : a.percent >= 40 ? "amber" : "gray"}>
                              {a.percent}%
                            </Badge>
                            <IconChevronRight width={14} height={14} className="text-muted" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rail-card space-y-3 p-6">
                <h3 className="font-semibold text-ink">Account</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Email</dt>
                    <dd className="truncate font-medium text-ink">{user?.email}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Member since</dt>
                    <dd className="font-medium text-ink">{memberSince || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Onboarding</dt>
                    <dd>
                      <Badge color={user?.onboardingComplete ? "green" : "gray"}>
                        {user?.onboardingComplete ? "Complete" : "Pending"}
                      </Badge>
                    </dd>
                  </div>
                  {dueCount > 0 && (
                    <div className="pt-2">
                      <Link to="/review" className="btn-outline w-full justify-center text-xs">
                        <IconCards width={14} height={14} />
                        Review {dueCount} due cards
                      </Link>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

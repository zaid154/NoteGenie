// FLOW: App.jsx route renders this page (Workspaces). Lists the workspaces the user
// belongs to, and lets them create a new one or join by invite code. Opening a
// workspace navigates to WorkspaceDetail.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Alert, Spinner, EmptyState, Badge } from "../components/ui.jsx";
import { StaggerContainer, StaggerItem } from "../components/motion.jsx";
import { IconUsers, IconPlus, IconChevronRight } from "../components/icons.jsx";

export default function Workspaces() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/workspaces", { name: name.trim() });
      toast("Workspace created", "success");
      navigate(`/workspaces/${data.workspace._id}`);
    } catch (err) {
      setError(apiError(err));
      setCreating(false);
    }
  }

  async function join(e) {
    e.preventDefault();
    if (!code.trim() || joining) return;
    setJoining(true);
    setError("");
    try {
      const { data } = await api.post("/workspaces/join", { code: code.trim() });
      toast(data.already ? "You're already a member" : "Joined workspace", "success");
      navigate(`/workspaces/${data.workspace._id}`);
    } catch (err) {
      setError(apiError(err));
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Workspaces</h1>
          <p className="mt-1 text-sm text-muted">
            Share materials with classmates or a study group. Members can read notes, study flashcards, take quizzes, and ask the tutor.
          </p>
        </StaggerItem>

        {error && (
          <StaggerItem>
            <Alert>{error}</Alert>
          </StaggerItem>
        )}

        <StaggerItem>
          <div className="grid gap-4 sm:grid-cols-2">
            <form onSubmit={create} className="panel space-y-3 p-5 shadow-soft">
              <p className="text-sm font-semibold text-ink">Create a workspace</p>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Biology Study Group"
                maxLength={80}
                disabled={creating}
              />
              <button type="submit" className="btn-primary w-full" disabled={creating || !name.trim()}>
                {creating ? <Spinner size={16} /> : <IconPlus width={16} height={16} />} Create
              </button>
            </form>

            <form onSubmit={join} className="panel space-y-3 p-5 shadow-soft">
              <p className="text-sm font-semibold text-ink">Join with a code</p>
              <input
                className="input font-mono"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste an invite code"
                disabled={joining}
              />
              <button type="submit" className="btn-outline w-full" disabled={joining || !code.trim()}>
                {joining ? <Spinner size={16} /> : <IconUsers width={16} height={16} />} Join
              </button>
            </form>
          </div>
        </StaggerItem>

        <StaggerItem>
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size={24} />
            </div>
          ) : workspaces.length === 0 ? (
            <EmptyState
              icon={IconUsers}
              title="No workspaces yet"
              subtitle="Create one to share your materials, or join one with an invite code."
            />
          ) : (
            <ul className="space-y-2">
              {workspaces.map((w) => (
                <li key={w._id}>
                  <Link
                    to={`/workspaces/${w._id}`}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-accent-300 hover:bg-accent-50/40 dark:hover:bg-accent-950/20"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-400">
                      <IconUsers width={18} height={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink group-hover:text-accent-600 dark:group-hover:text-accent-400">
                        {w.name}
                      </p>
                      <p className="text-xs text-muted">
                        {w.memberCount} member{w.memberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge color={w.isOwner ? "brand" : "gray"}>{w.isOwner ? "Owner" : "Member"}</Badge>
                    <IconChevronRight width={16} height={16} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

// AdminUsers: saare users ki table. Admin yahan se user delete kar sakta hai.
import { useEffect, useState } from "react";
import { api, apiError } from "../../api/client.js";
import { Alert, Badge, Spinner } from "../../components/ui.jsx";
import { IconTrash } from "../../components/icons.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null); // kis user ki id abhi delete ho rahi hai
  const confirm = useConfirm();

  // load: backend se users ki list le aao.
  async function load() {
    setError("");
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  // Page khulte hi ek baar load karo.
  useEffect(() => {
    load();
  }, []);

  // remove: confirm ke baad ek user delete karo aur list me se bhi hata do.
  async function remove(id) {
    const ok = await confirm({
      title: "Delete this user?",
      message: "This permanently removes the user along with all their materials, quizzes, and chat history.",
      confirmText: "Delete user",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/users/${id}`);
      // List me se us user ko hata do (dobara load kiye bina).
      setUsers((u) => u.filter((x) => x.id !== id));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={24} />
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="card p-10 text-center text-muted">No users yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-canvas/50">
            <tr>
              <th className="px-4 py-3 font-600 text-ink">Name</th>
              <th className="px-4 py-3 font-600 text-ink">Email</th>
              <th className="px-4 py-3 font-600 text-ink">Role</th>
              <th className="px-4 py-3 font-600 text-ink">Materials</th>
              <th className="px-4 py-3 font-600 text-ink">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-ink/[0.02]">
                <td className="px-4 py-3 font-500">{u.name}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge color={u.role === "admin" ? "brand" : "gray"}>{u.role}</Badge>
                </td>
                <td className="px-4 py-3">{u.documentCount}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "admin" && (
                    <button
                      onClick={() => remove(u.id)}
                      disabled={deleting === u.id}
                      className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-600"
                      title="Delete user"
                      aria-label={`Delete ${u.name}`}
                    >
                      {deleting === u.id ? <Spinner size={16} /> : <IconTrash width={16} height={16} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// client/src/pages/AdminPage/AdminGroups.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trash2, Users, FolderKanban, X, Loader } from "lucide-react";
import { getAdminGroups, deleteAdminGroup } from "../../api/adminApi";
import "./Admin.css";

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  /* ── Fetch ──────────────────────────────────────────────── */
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await getAdminGroups();
      setGroups(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error("fetchGroups error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  /* ── Search ─────────────────────────────────────────────── */
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(groups.filter((g) => g.name.toLowerCase().includes(q)));
  }, [search, groups]);

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSubmitting(true);
      await deleteAdminGroup(deleteId);
      setDeleteId(null);
      setDeleteName("");
      fetchGroups();
    } catch (err) {
      console.error("deleteGroup error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Initials ───────────────────────────────────────────── */
  const initials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "G";

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading groups...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">Groups</h1>
          <p className="admin-page-subtitle">
            {groups.length} total group{groups.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">All Groups</span>
          <div className="admin-table-actions">
            <div
              className="search-container"
              style={{ marginBottom: 0, minWidth: 220 }}
            >
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty-state">
            <FolderKanban size={32} />
            <p className="admin-empty-text">No groups found</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Created By</th>
                  <th>Members</th>
                  <th>Total Expenses</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((group) => (
                  <tr key={group._id}>
                    {/* Group name */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          className="group-icon"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        >
                          <FolderKanban size={16} />
                        </div>
                        <div>
                          <div className="font-semibold">{group.name}</div>
                          {group.description && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              {group.description.slice(0, 40)}
                              {group.description.length > 40 ? "..." : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Created by */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          className="avatar"
                          style={{ width: 26, height: 26, fontSize: 10 }}
                        >
                          {initials(group.createdBy?.name ?? "?")}
                        </div>
                        <span>{group.createdBy?.name ?? "Unknown"}</span>
                      </div>
                    </td>

                    {/* Members */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Users
                          size={13}
                          style={{ color: "var(--text-muted)" }}
                        />
                        <span>{group.members?.length ?? 0}</span>
                      </div>
                    </td>

                    {/* Total expenses */}
                    <td
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 700,
                        color: "var(--accent-soft)",
                      }}
                    >
                      Rs {(group.totalExpenses ?? 0).toLocaleString()}
                    </td>

                    {/* Created date */}
                    <td>
                      {new Date(group.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="admin-action-btn primary"
                          onClick={() =>
                            navigate(`/admin/expenses?groupId=${group._id}`)
                          }
                        >
                          <FolderKanban size={12} /> Expenses
                        </button>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => {
                            setDeleteId(group._id);
                            setDeleteName(group.name);
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Members expandable section ─────────────────── */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {filtered.map((group) => (
          <GroupMembersCard key={group._id} group={group} />
        ))}
      </div>

      {/* ── Delete confirm modal ───────────────────────── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete Group</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteId(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">
              Are you sure you want to delete <strong>{deleteName}</strong>?
              This will permanently remove the group and all its expenses and
              activities. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setDeleteId(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDelete}
                disabled={submitting}
                style={{
                  background:
                    "linear-gradient(135deg, var(--red) 0%, #c0392b 100%)",
                  boxShadow: "0 4px 20px var(--red-glow)",
                }}
              >
                {submitting ? <Loader size={15} /> : <Trash2 size={15} />}
                {submitting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Group members expandable card ───────────────────────── */
function GroupMembersCard({ group }) {
  const [open, setOpen] = useState(false);

  const initials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div className="dashboard-section">
      <div
        className="section-header"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="section-title">{group.name} — Members</span>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {open ? "Hide" : `Show ${group.members?.length ?? 0} members`}
        </span>
      </div>

      {open && (
        <div className="members-list">
          {group.members?.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No members
            </p>
          ) : (
            group.members.map((m) => (
              <div className="member-item" key={m._id}>
                <div className="member-info">
                  <div
                    className="avatar"
                    style={{ width: 34, height: 34, fontSize: 12 }}
                  >
                    {initials(m.user?.name ?? "?")}
                  </div>
                  <div>
                    <div className="member-name">
                      {m.user?.name ?? "Unknown"}
                    </div>
                    <div className="member-email">{m.user?.email ?? ""}</div>
                  </div>
                </div>
                <span
                  className={`role-badge ${m.role === "admin" ? "role-admin" : "role-member"}`}
                >
                  {m.role ?? "member"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

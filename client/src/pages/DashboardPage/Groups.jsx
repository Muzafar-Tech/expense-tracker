// client/src/pages/DashboardPage/Groups.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Plus, Search, ArrowRight, Trash2, Crown, User } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

function Groups() {
  const [groups, setGroups]             = useState([]);
  const [searchQuery, setSearchQuery]   = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : data.groups || []);
      setError(null);
    } catch (err) {
      console.error("fetchGroups error:", err);
      setError("Failed to load groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/groups", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
      });
      const data = await res.json();
      if (res.ok) {
        setGroups((prev) => [...prev, data]);
        setShowCreateModal(false);
        setNewGroupName("");
        setNewGroupDesc("");
      } else {
        alert(data.message || "Failed to create group");
      }
    } catch (err) {
      alert("Failed to create group");
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm("Delete this group? This will remove all expenses and balances.")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroups((prev) => prev.filter((g) => g._id !== id));
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete group");
      }
    } catch (err) {
      alert("Failed to delete group");
    }
  };

  const filteredGroups = groups.filter((g) =>
    g?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">Manage your expense groups</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} /> Create Group
        </button>
      </div>

      {/* Search */}
      <div className="search-container">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {loading && <div className="loading-state"><div className="spinner" /><p>Loading groups...</p></div>}
      {error && !loading && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={fetchGroups}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div className="groups-grid">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => {
              const isAdmin = group.userRole === "admin";
              return (
                <div key={group._id} className="group-card-large">

                  {/* Role badge */}
                  <div className="group-role-badge-row">
                    {isAdmin ? (
                      <span className="role-badge role-admin">
                        <Crown size={11} /> Admin
                      </span>
                    ) : (
                      <span className="role-badge role-member">
                        <User size={11} /> Member
                      </span>
                    )}
                  </div>

                  <Link to={`/dashboard/groups/${group._id}`}>
                    <div className="group-card-header">
                      <div className="group-icon-large"><Users size={32} /></div>
                      <ArrowRight size={20} className="arrow-icon" />
                    </div>

                    <h3 className="group-name-large">{group.name}</h3>
                    <p className="group-description">{group.description || "No description"}</p>

                    <div className="group-stats">
                      <div className="stat-item">
                        <span className="stat-label">Members</span>
                        <span className="stat-value">{group.members?.length || 1}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Spent</span>
                        <span className="stat-value">Rs {(group.totalExpenses || 0).toLocaleString()}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Your Balance</span>
                        <span className={`stat-value ${group.balance >= 0 ? "positive" : "negative"}`}>
                          {group.balance >= 0 ? "+" : "-"}Rs {Math.abs(group.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Delete — admin only */}
                  {isAdmin && (
                    <div className="group-delete-container">
                      <button
                        className="group-delete-btn"
                        onClick={() => handleDeleteGroup(group._id)}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <Users size={48} />
              <p>No groups found</p>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                Create Your First Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Roommates, Weekend Trip"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group for?"
                  className="form-input"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Groups;
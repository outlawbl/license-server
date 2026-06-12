"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface License {
  id: number;
  license_key: string;
  client_name: string;
  client_email?: string;
  status: "active" | "suspended" | "expired" | "revoked";
  expires_at?: string;
  issued_at: string;
  features: string[];
  notes?: string;
  last_validated_at?: string;
  last_seen_at?: string;
  validation_count: number;
  panconnect_version?: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total_licenses: number;
  active_licenses: number;
  suspended_licenses: number;
  expired_licenses: number;
  validations_today: number;
  validations_this_month: number;
  active_last_24h: number;
}

interface NewLicense {
  client_name: string;
  client_email?: string;
  expires_at?: string;
  features: string[];
  notes?: string;
}

export default function Dashboard() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  // New license form
  const [newLicense, setNewLicense] = useState<NewLicense>({
    client_name: "",
    client_email: "",
    expires_at: "",
    features: ["pantheon"],
    notes: ""
  });

  // Edit license form
  const [editLicense, setEditLicense] = useState<NewLicense>({
    client_name: "",
    client_email: "",
    expires_at: "",
    features: ["pantheon"],
    notes: ""
  });

  useEffect(() => {
    fetchLicenses();
    fetchStats();
  }, []);

  const fetchLicenses = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/licenses?page=1&page_size=100`);
      const data = await res.json();
      setLicenses(data.licenses);
    } catch (error) {
      console.error("Failed to fetch licenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const createLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Prepare data - convert date to datetime if needed
      const requestData = {
        ...newLicense,
        expires_at: newLicense.expires_at ? `${newLicense.expires_at}T23:59:59` : undefined
      };
      console.log("Creating license:", requestData);
      const res = await fetch(`${API_URL}/api/v1/admin/licenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail || errorData);
        throw new Error(errorMsg || `Failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("Created license:", data);

      setSuccess("License created successfully!");
      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess(null);
        setNewLicense({
          client_name: "",
          client_email: "",
          expires_at: "",
          features: ["pantheon"],
          notes: ""
        });
        fetchLicenses();
        fetchStats();
      }, 1000);
    } catch (error: any) {
      console.error("Failed to create license:", error);
      setError(error.message || "Failed to create license");
    }
  };

  const openEditModal = (license: License) => {
    setEditingLicense(license);
    setEditLicense({
      client_name: license.client_name,
      client_email: license.client_email || "",
      expires_at: license.expires_at ? license.expires_at.split('T')[0] : "",
      features: license.features,
      notes: license.notes || ""
    });
    setShowEditModal(true);
    setError(null);
    setSuccess(null);
  };

  const updateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    setError(null);
    setSuccess(null);

    try {
      const requestData = {
        ...editLicense,
        expires_at: editLicense.expires_at ? `${editLicense.expires_at}T23:59:59` : null,
        status: editingLicense.status
      };
      delete (requestData as any).client_email; // Can't change email

      console.log("Updating license:", editingLicense.id, requestData);
      const res = await fetch(`${API_URL}/api/v1/admin/licenses/${editingLicense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail || errorData);
        throw new Error(errorMsg || `Failed with status ${res.status}`);
      }

      setSuccess("License updated successfully!");
      setTimeout(() => {
        setShowEditModal(false);
        setSuccess(null);
        setEditingLicense(null);
        fetchLicenses();
        fetchStats();
      }, 1000);
    } catch (error: any) {
      console.error("Failed to update license:", error);
      setError(error.message || "Failed to update license");
    }
  };

  const suspendLicense = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/v1/admin/licenses/${id}/suspend`, {
        method: "POST"
      });
      fetchLicenses();
      fetchStats();
    } catch (error) {
      console.error("Failed to suspend license:", error);
    }
  };

  const activateLicense = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/v1/admin/licenses/${id}/activate`, {
        method: "POST"
      });
      fetchLicenses();
      fetchStats();
    } catch (error) {
      console.error("Failed to activate license:", error);
    }
  };

  const deleteLicense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this license?")) return;
    try {
      await fetch(`${API_URL}/api/v1/admin/licenses/${id}`, {
        method: "DELETE"
      });
      fetchLicenses();
      fetchStats();
    } catch (error) {
      console.error("Failed to delete license:", error);
    }
  };

  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch =
      lic.client_name.toLowerCase().includes(search.toLowerCase()) ||
      lic.license_key.toLowerCase().includes(search.toLowerCase()) ||
      lic.client_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || lic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "suspended": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      case "revoked": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panconnect License Server</h1>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + New License
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Total Licenses</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_licenses}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-3xl font-bold text-green-600">{stats.active_licenses}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Suspended</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.suspended_licenses}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">Active (24h)</p>
              <p className="text-3xl font-bold text-blue-600">{stats.active_last_24h}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by name, key, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {/* Licenses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLicenses.map((license) => (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">{license.license_key}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{license.client_name}</div>
                      {license.client_email && (
                        <div className="text-sm text-gray-500">{license.client_email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(license.status)}`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : "Lifetime"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {license.last_seen_at ? new Date(license.last_seen_at).toLocaleString() : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(license)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        {license.status === "active" ? (
                          <button
                            onClick={() => suspendLicense(license.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => activateLicense(license.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => deleteLicense(license.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLicenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No licenses found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create License Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create New License</h2>
            </div>
            <form onSubmit={createLicense} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={newLicense.client_name}
                  onChange={(e) => setNewLicense({ ...newLicense, client_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                <input
                  type="email"
                  value={newLicense.client_email}
                  onChange={(e) => setNewLicense({ ...newLicense, client_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                <input
                  type="date"
                  value={newLicense.expires_at}
                  onChange={(e) => setNewLicense({ ...newLicense, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for lifetime license</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                <div className="space-y-2">
                  {["pantheon", "wms", "invoicing", "catalog"].map((feature) => (
                    <label key={feature} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newLicense.features.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewLicense({ ...newLicense, features: [...newLicense.features, feature] });
                          } else {
                            setNewLicense({ ...newLicense, features: newLicense.features.filter(f => f !== feature) });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="capitalize text-gray-900">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newLicense.notes}
                  onChange={(e) => setNewLicense({ ...newLicense, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit License Modal */}
      {showEditModal && editingLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Edit License</h2>
              <p className="text-sm text-gray-500">{editingLicense.license_key}</p>
            </div>
            <form onSubmit={updateLicense} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  value={editLicense.client_name}
                  onChange={(e) => setEditLicense({ ...editLicense, client_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                <input
                  type="date"
                  value={editLicense.expires_at}
                  onChange={(e) => setEditLicense({ ...editLicense, expires_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for lifetime license</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingLicense.status}
                  onChange={(e) => {
                    const updated = { ...editingLicense, status: e.target.value as any };
                    setEditingLicense(updated);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (Modules)</label>
                <div className="space-y-2">
                  {["pantheon", "wms", "invoicing", "catalog"].map((feature) => (
                    <label key={feature} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editLicense.features.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditLicense({ ...editLicense, features: [...editLicense.features, feature] });
                          } else {
                            setEditLicense({ ...editLicense, features: editLicense.features.filter(f => f !== feature) });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="capitalize text-gray-900">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editLicense.notes}
                  onChange={(e) => setEditLicense({ ...editLicense, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={2}
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">
                  <strong>Info:</strong> Last seen: {editingLicense.last_seen_at
                    ? new Date(editingLicense.last_seen_at).toLocaleString()
                    : "Never"}
                  {" • "} Validations: {editingLicense.validation_count}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

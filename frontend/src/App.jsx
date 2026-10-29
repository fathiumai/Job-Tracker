import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from "./api";

const STATUSES = [
  "SAVED",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "REJECTED",
  "OFFER",
  "WITHDRAWN",
];

const statusLabels = {
  SAVED: "Saved",
  APPLIED: "Applied",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  REJECTED: "Rejected",
  OFFER: "Offer",
  WITHDRAWN: "Withdrawn",
};

const emptyForm = {
  companyName: "",
  position: "",
  dateApplied: "",
  location: "",
  jobType: "FULL_TIME",
  status: "SAVED",
  jobUrl: "",
  notes: "",
};

function App() {
  const [applications, setApplications] = useState([]);
  const [activePage, setActivePage] = useState("Dashboard");
  const [showForm, setShowForm] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const applicationsPerPage = 5;
  const [formData, setFormData] = useState({ ...emptyForm });

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch((err) => {
        console.error("Failed to load applications:", err);
        setError("Unable to load applications. Please refresh the page.");
      });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.companyName.trim()) {
      setError("Company Name is required.");
      return;
    }
    if (!formData.position.trim()) {
      setError("Position is required.");
      return;
    }
    if (!formData.dateApplied) {
      setError("Date Applied is required.");
      return;
    }

    try {
      if (selectedApplication) {
        const updated = await updateApplication(
          selectedApplication.id,
          formData,
        );
        setApplications((previous) =>
          previous.map((app) => (app.id === updated.id ? updated : app)),
        );
        setSelectedApplication(updated);
      } else {
        const created = await createApplication(formData);
        setApplications((previous) => [...previous, created]);
        setCurrentPage(1);
      }
      setFormData({ ...emptyForm });
      setShowForm(false);
      setError("");
    } catch (err) {
      console.error("Failed to save application:", err);
      if (err.response?.fields) {
        setError(
          Object.values(err.response.fields)[0] || "Please check the form.",
        );
      } else {
        setError(
          err.message || "Unable to save the application. Please try again.",
        );
      }
    }
  };

  const handleEdit = () => {
    if (!selectedApplication) return;
    setFormData({
      companyName: selectedApplication.companyName || "",
      position: selectedApplication.position || "",
      dateApplied: selectedApplication.dateApplied || "",
      location: selectedApplication.location || "",
      jobType: selectedApplication.jobType || "FULL_TIME",
      status: selectedApplication.status || "SAVED",
      jobUrl: selectedApplication.jobUrl || "",
      notes: selectedApplication.notes || "",
    });
    setError("");
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!selectedApplication) return;
    if (
      !window.confirm(
        `Are you sure you want to delete the application for ${selectedApplication.companyName}?`,
      )
    )
      return;

    setError("");
    try {
      await deleteApplication(selectedApplication.id);
      setApplications((previous) =>
        previous.filter((app) => app.id !== selectedApplication.id),
      );
      setSelectedApplication(null);
    } catch (err) {
      console.error("Failed to delete application:", err);
      setError(err.message || "Unable to delete the application.");
    }
  };

  const openNewApplicationForm = () => {
    setSelectedApplication(null);
    setFormData({ ...emptyForm });
    setError("");
    setShowForm(true);
  };

  const filteredApplications = applications
    .filter((app) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        (app.companyName || "").toLowerCase().includes(search) ||
        (app.position || "").toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === "ALL" || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "company") {
        return (a.companyName || "").localeCompare(b.companyName || "");
      }
      const dateA = a.dateApplied
        ? new Date(`${a.dateApplied}T00:00:00`).getTime()
        : 0;
      const dateB = b.dateApplied
        ? new Date(`${b.dateApplied}T00:00:00`).getTime()
        : 0;
      return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
    });

  const totalPages = Math.ceil(
    filteredApplications.length / applicationsPerPage,
  );
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (safeCurrentPage - 1) * applicationsPerPage;
  const paginatedApplications = filteredApplications.slice(
    startIndex,
    startIndex + applicationsPerPage,
  );

  const statusCounts = Object.fromEntries(
    STATUSES.map((status) => [
      status,
      applications.filter((app) => app.status === status).length,
    ]),
  );

  const chartData = STATUSES.map((status) => ({
    status: statusLabels[status],
    count: statusCounts[status],
  }));

  const monthlyChartData = (() => {
    const counts = {};
    applications.forEach((app) => {
      if (!app.dateApplied) return;
      const date = new Date(`${app.dateApplied}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (!counts[monthKey]) counts[monthKey] = { month: monthLabel, count: 0 };
      counts[monthKey].count += 1;
    });
    return Object.keys(counts)
      .sort()
      .map((key) => counts[key]);
  })();

  const recentApplications = [...applications]
    .sort((a, b) => {
      const dateA = a.dateApplied
        ? new Date(`${a.dateApplied}T00:00:00`).getTime()
        : 0;
      const dateB = b.dateApplied
        ? new Date(`${b.dateApplied}T00:00:00`).getTime()
        : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  const chartGridColor = darkMode ? "#475569" : "#CBD5E1";
  const chartTextColor = darkMode ? "#CBD5E1" : "#475569";
  const chartTooltipStyle = {
    backgroundColor: darkMode ? "#1E293B" : "#FFFFFF",
    border: `1px solid ${darkMode ? "#475569" : "#E2E8F0"}`,
    borderRadius: "8px",
    color: darkMode ? "#F8FAFC" : "#0F172A",
  };

  const navItems = [
    { label: "Dashboard", icon: "▦" },
    { label: "Applications", icon: "▤" },
    { label: "Charts & Analytics", icon: "▥" },
  ];

  const styles = makeStyles(darkMode);

  const statusColors = {
    SAVED: {
      backgroundColor: darkMode ? "#334155" : "#F1F5F9",
      color: darkMode ? "#E2E8F0" : "#475569",
    },
    APPLIED: {
      backgroundColor: darkMode ? "#1E3A8A" : "#DBEAFE",
      color: darkMode ? "#BFDBFE" : "#1D4ED8",
    },
    ASSESSMENT: {
      backgroundColor: darkMode ? "#581C87" : "#F3E8FF",
      color: darkMode ? "#E9D5FF" : "#7E22CE",
    },
    INTERVIEW: {
      backgroundColor: darkMode ? "#78350F" : "#FEF3C7",
      color: darkMode ? "#FDE68A" : "#92400E",
    },
    REJECTED: {
      backgroundColor: darkMode ? "#7F1D1D" : "#FEE2E2",
      color: darkMode ? "#FECACA" : "#B91C1C",
    },
    OFFER: {
      backgroundColor: darkMode ? "#14532D" : "#DCFCE7",
      color: darkMode ? "#BBF7D0" : "#166534",
    },
    WITHDRAWN: {
      backgroundColor: darkMode ? "#334155" : "#F1F5F9",
      color: darkMode ? "#CBD5E1" : "#64748B",
    },
  };

  return (
    <div style={styles.appLayout}>
      <aside style={styles.sidebar}>
        <h1 style={styles.sidebarLogo}>JobTrack</h1>
        <p style={styles.sidebarSubtitle}>Your career journey, organized.</p>
        <p style={styles.navHeading}>WORKSPACE</p>
        <nav style={styles.sidebarNav}>
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              style={{
                ...styles.navButton,
                ...(activePage === item.label ? styles.navButtonActive : {}),
              }}
              onClick={() => setActivePage(item.label)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          <span style={styles.sidebarFooterDot} />
          Stay focused. Keep applying.
        </div>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.header}>
          <div>
            <p style={styles.breadcrumb}>
              WORKSPACE / {activePage.toUpperCase()}
            </p>
            <h1 style={styles.pageTitle}>{activePage}</h1>
            <p style={styles.subtitle}>
              {activePage === "Dashboard"
                ? "Track your job search progress at a glance."
                : activePage === "Applications"
                  ? "Manage and keep track of your job applications."
                  : "Understand your job search progress through analytics."}
            </p>
          </div>
          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.themeButton}
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? "☀ Light Mode" : "☾ Dark Mode"}
            </button>
            <button
              type="button"
              style={styles.addButton}
              onClick={openNewApplicationForm}
            >
              + Add Application
            </button>
          </div>
        </header>

        {error && !showForm && <div style={styles.errorMessage}>{error}</div>}

        {showForm && (
          <form style={styles.formCard} onSubmit={handleSubmit}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>
                {selectedApplication ? "Edit Application" : "Add Application"}
              </h2>
              <button
                type="button"
                style={styles.closeButton}
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>
            {error && <div style={styles.errorMessage}>{error}</div>}
            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>Company Name</label>
                <input
                  required
                  name="companyName"
                  placeholder="e.g. Dialog Axiata"
                  value={formData.companyName}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Position</label>
                <input
                  required
                  name="position"
                  placeholder="e.g. Software Engineer"
                  value={formData.position}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Date Applied</label>
                <input
                  required
                  type="date"
                  name="dateApplied"
                  value={formData.dateApplied}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Location</label>
                <input
                  name="location"
                  placeholder="e.g. Colombo"
                  value={formData.location}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>Job Type</label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={styles.input}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.fullWidth}>
                <label style={styles.label}>Job URL</label>
                <input
                  type="url"
                  name="jobUrl"
                  placeholder="https://..."
                  value={formData.jobUrl}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.fullWidth}>
                <label style={styles.label}>Notes</label>
                <textarea
                  name="notes"
                  placeholder="Add any notes about this application..."
                  value={formData.notes}
                  onChange={handleChange}
                  style={styles.textarea}
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" style={styles.saveButton}>
                Save Application
              </button>
            </div>
          </form>
        )}

        {activePage === "Dashboard" && (
          <>
            <section style={styles.statsContainer}>
              {[
                ["Total Applications", applications.length, "statTotal"],
                ["Applied", statusCounts.APPLIED, "statApplied"],
                ["Interviews", statusCounts.INTERVIEW, "statInterview"],
                ["Offers", statusCounts.OFFER, "statOffer"],
                ["Rejected", statusCounts.REJECTED, "statRejected"],
                ["Assessments", statusCounts.ASSESSMENT, "statAssessment"],
              ].map(([label, value, card]) => (
                <div
                  key={label}
                  style={{ ...styles.statCard, ...styles[card] }}
                >
                  <p style={styles.statLabel}>{label}</p>
                  <h2 style={styles.statNumber}>{value}</h2>
                </div>
              ))}
            </section>

            <section style={styles.recentCard}>
              <div style={styles.recentHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Recent Applications</h2>
                  <p style={styles.recentSubtitle}>
                    Keep track of your latest job applications.
                  </p>
                </div>
                <button
                  type="button"
                  style={styles.viewAllButton}
                  onClick={() => setActivePage("Applications")}
                >
                  View All →
                </button>
              </div>
              {recentApplications.length === 0 ? (
                <div style={styles.recentEmptyState}>
                  <div style={styles.emptyIcon}>▤</div>
                  <h3 style={styles.emptyTitle}>No applications yet</h3>
                  <p>
                    Start tracking your job search by adding your first
                    application.
                  </p>
                  <button
                    type="button"
                    style={styles.addFirstButton}
                    onClick={openNewApplicationForm}
                  >
                    + Add Your First Application
                  </button>
                </div>
              ) : (
                recentApplications.map((app) => (
                  <div key={app.id} style={styles.recentRow}>
                    <button
                      type="button"
                      style={styles.recentApplicationInfo}
                      onClick={() => {
                        setSelectedApplication(app);
                        setActivePage("Applications");
                      }}
                    >
                      <span style={styles.companyAvatar}>
                        {(app.companyName || "?")
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                      <span style={styles.recentText}>
                        <strong style={styles.recentCompany}>
                          {app.companyName}
                        </strong>
                        <span style={styles.recentPosition}>
                          {app.position}
                        </span>
                        <span style={styles.recentDate}>
                          Applied:{" "}
                          {app.dateApplied
                            ? new Date(
                                `${app.dateApplied}T00:00:00`,
                              ).toLocaleDateString()
                            : "Date not set"}
                        </span>
                      </span>
                    </button>
                    <span
                      style={{
                        ...styles.recentStatus,
                        ...statusColors[app.status],
                      }}
                    >
                      {statusLabels[app.status] || app.status || "Saved"}
                    </span>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {activePage === "Charts & Analytics" && (
          <>
            <section style={styles.chartCard}>
              <h2 style={styles.sectionTitle}>Application Status Analytics</h2>
              <div style={{ width: "100%", height: 320, marginTop: 24 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartGridColor}
                    />
                    <XAxis
                      dataKey="status"
                      tick={{ fill: chartTextColor, fontSize: 12 }}
                      axisLine={{ stroke: chartGridColor }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: chartTextColor, fontSize: 12 }}
                      axisLine={{ stroke: chartGridColor }}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar
                      dataKey="count"
                      name="Applications"
                      fill="#3B82F6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section style={styles.chartCard}>
              <h2 style={styles.sectionTitle}>Monthly Application Trend</h2>
              {monthlyChartData.length === 0 ? (
                <p style={styles.subtitle}>
                  No application dates available to display yet.
                </p>
              ) : (
                <div style={{ width: "100%", height: 320, marginTop: 24 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyChartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartGridColor}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: chartTextColor, fontSize: 12 }}
                        axisLine={{ stroke: chartGridColor }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: chartTextColor, fontSize: 12 }}
                        axisLine={{ stroke: chartGridColor }}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar
                        dataKey="count"
                        name="Applications"
                        fill="#06B6D4"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </>
        )}

        {activePage === "Applications" && (
          <section>
            <div style={styles.applicationToolbar}>
              <h2 style={styles.sectionTitle}>Applications</h2>
              <input
                placeholder="Search company or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="ALL">All Statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="company">Company A–Z</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setSortBy("newest");
                }}
                style={styles.clearButton}
              >
                Clear
              </button>
            </div>

            {filteredApplications.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No applications found.</p>
              </div>
            ) : (
              <>
                <div style={styles.applicationList}>
                  {paginatedApplications.map((app) => (
                    <button
                      type="button"
                      key={app.id}
                      style={styles.applicationCard}
                      onClick={() => setSelectedApplication(app)}
                    >
                      <div>
                        <h3 style={styles.companyName}>{app.companyName}</h3>
                        <p style={styles.position}>{app.position}</p>
                        <p style={styles.details}>
                          📍 {app.location || "Location not specified"}
                        </p>
                        <p style={styles.details}>
                          Applied: {app.dateApplied || "Not specified"}
                        </p>
                      </div>
                      <div style={styles.statusContainer}>
                        <span
                          style={{
                            ...styles.status,
                            ...statusColors[app.status],
                          }}
                        >
                          {statusLabels[app.status] || app.status}
                        </span>
                        <span style={styles.jobType}>
                          {(app.jobType || "").replace(/_/g, " ")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div style={styles.pagination}>
                  <button
                    type="button"
                    style={styles.pageButton}
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={styles.pageText}>
                    Page {safeCurrentPage} of {Math.max(1, totalPages)}
                  </span>
                  <button
                    type="button"
                    style={styles.pageButton}
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {activePage === "Applications" && selectedApplication && (
          <section style={styles.detailsPanel}>
            <div style={styles.detailsHeader}>
              <div>
                <h2 style={styles.detailsTitle}>Application Details</h2>
                <p style={styles.detailsSubtitle}>
                  {selectedApplication.companyName}
                </p>
              </div>
              <div style={styles.detailActions}>
                <button
                  type="button"
                  style={styles.deleteButton}
                  onClick={handleDelete}
                >
                  Delete Application
                </button>
                <button
                  type="button"
                  style={styles.editButton}
                  onClick={handleEdit}
                >
                  Edit Application
                </button>
                <button
                  type="button"
                  style={styles.closeDetailsButton}
                  onClick={() => setSelectedApplication(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={styles.detailsGrid}>
              {[
                ["Company", selectedApplication.companyName],
                ["Position", selectedApplication.position],
                ["Location", selectedApplication.location || "Not specified"],
                ["Date Applied", selectedApplication.dateApplied],
                [
                  "Job Type",
                  (selectedApplication.jobType || "").replace(/_/g, " "),
                ],
                [
                  "Status",
                  statusLabels[selectedApplication.status] ||
                    selectedApplication.status,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={styles.detailLabel}>{label}</p>
                  <p style={styles.detailValue}>{value || "Not specified"}</p>
                </div>
              ))}
              <div style={styles.fullWidth}>
                <p style={styles.detailLabel}>Job URL</p>
                {selectedApplication.jobUrl ? (
                  <a
                    href={selectedApplication.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.jobLink}
                  >
                    Open Job Posting
                  </a>
                ) : (
                  <p style={styles.detailValue}>No job URL provided</p>
                )}
              </div>
              <div style={styles.fullWidth}>
                <p style={styles.detailLabel}>Notes</p>
                <p style={styles.notesValue}>
                  {selectedApplication.notes || "No notes added."}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function makeStyles(darkMode) {
  const text = darkMode ? "#F8FAFC" : "#0F172A";
  const muted = darkMode ? "#CBD5E1" : "#64748B";
  const card = darkMode ? "#1E293B" : "#FFFFFF";
  const border = darkMode ? "#334155" : "#E2E8F0";
  const inputBg = darkMode ? "#0F172A" : "#FFFFFF";
  const inputBorder = darkMode ? "#475569" : "#CBD5E1";
  return {
    appLayout: {
      display: "flex",
      minHeight: "100vh",
      backgroundColor: darkMode ? "#0F172A" : "#F8FAFC",
      color: text,
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    },
    sidebar: {
      width: 240,
      minWidth: 240,
      backgroundColor: "#18181B",
      color: "#F8FAFC",
      padding: "28px 16px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    },
    sidebarLogo: {
      fontSize: 25,
      fontWeight: 800,
      margin: "0 0 8px",
      color: "#FFFFFF",
      letterSpacing: "-0.7px",
    },
    sidebarSubtitle: {
      fontSize: 12,
      color: "#A1A1AA",
      margin: "0 0 36px",
      lineHeight: 1.6,
    },
    navHeading: {
      fontSize: 10,
      color: "#71717A",
      fontWeight: 800,
      letterSpacing: "1.4px",
      margin: "0 0 12px 10px",
    },
    sidebarNav: { display: "flex", flexDirection: "column", gap: 8 },
    navButton: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%",
      textAlign: "left",
      padding: "13px 14px",
      border: "none",
      borderRadius: 9,
      backgroundColor: "transparent",
      color: "#D4D4D8",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    navButtonActive: { backgroundColor: "#2563EB", color: "#FFFFFF" },
    navIcon: { width: 20, textAlign: "center", fontSize: 18 },
    sidebarFooter: {
      marginTop: "auto",
      paddingTop: 28,
      fontSize: 11,
      color: "#A1A1AA",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    sidebarFooterDot: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      backgroundColor: "#22C55E",
      display: "inline-block",
    },
    mainContent: {
      flex: 1,
      minWidth: 0,
      minHeight: "100vh",
      padding: 32,
      boxSizing: "border-box",
      backgroundColor: darkMode ? "#0F172A" : "#F8FAFC",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 20,
      marginBottom: 32,
    },
    breadcrumb: {
      margin: "0 0 10px",
      color: muted,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "1.2px",
    },
    pageTitle: {
      margin: 0,
      fontSize: 30,
      fontWeight: 800,
      color: text,
      letterSpacing: "-0.8px",
    },
    subtitle: {
      marginTop: 8,
      marginBottom: 0,
      color: muted,
      fontSize: 13,
      lineHeight: 1.6,
    },
    headerActions: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
    },
    themeButton: {
      backgroundColor: card,
      color: text,
      border: `1px solid ${inputBorder}`,
      padding: "12px 16px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    addButton: {
      backgroundColor: "#2563EB",
      color: "#FFFFFF",
      border: "none",
      padding: "12px 18px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
    },
    statsContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
      gap: 14,
      marginBottom: 28,
    },
    statCard: {
      backgroundColor: card,
      padding: 20,
      borderRadius: 12,
      border: `1px solid ${border}`,
      boxShadow: "0 2px 6px rgba(15,23,42,.03)",
      minWidth: 0,
    },
    statTotal: {
      backgroundColor: darkMode ? "#1E3A8A" : "#EFF6FF",
      borderColor: darkMode ? "#1D4ED8" : "#BFDBFE",
    },
    statApplied: {
      backgroundColor: darkMode ? "#164E63" : "#E0F2FE",
      borderColor: darkMode ? "#0E7490" : "#BAE6FD",
    },
    statInterview: {
      backgroundColor: darkMode ? "#78350F" : "#FEF3C7",
      borderColor: darkMode ? "#92400E" : "#FDE68A",
    },
    statOffer: {
      backgroundColor: darkMode ? "#14532D" : "#DCFCE7",
      borderColor: darkMode ? "#166534" : "#BBF7D0",
    },
    statRejected: {
      backgroundColor: darkMode ? "#7F1D1D" : "#FEE2E2",
      borderColor: darkMode ? "#991B1B" : "#FECACA",
    },
    statAssessment: {
      backgroundColor: darkMode ? "#581C87" : "#F3E8FF",
      borderColor: darkMode ? "#6B21A8" : "#E9D5FF",
    },
    statLabel: {
      margin: 0,
      fontSize: 12,
      fontWeight: 700,
      color: darkMode ? "#E2E8F0" : "#334155",
      lineHeight: 1.5,
    },
    statNumber: {
      margin: "12px 0 0",
      fontSize: 30,
      fontWeight: 800,
      color: text,
      letterSpacing: "-0.8px",
    },
    recentCard: {
      backgroundColor: card,
      padding: 24,
      borderRadius: 14,
      border: `1px solid ${border}`,
      boxShadow: "0 2px 6px rgba(15,23,42,.03)",
      marginBottom: 28,
      minWidth: 0,
    },
    recentHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
      marginBottom: 18,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: 700,
      color: text,
      margin: 0,
      letterSpacing: "-0.4px",
    },
    recentSubtitle: {
      margin: "7px 0 0",
      color: muted,
      fontSize: 12,
      lineHeight: 1.6,
    },
    viewAllButton: {
      backgroundColor: "transparent",
      color: "#2563EB",
      border: "1px solid #BFDBFE",
      padding: "10px 14px",
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    recentRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "16px 0",
      flexWrap: "wrap",
      borderTop: `1px solid ${border}`,
    },
    recentApplicationInfo: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      flex: 1,
      minWidth: 180,
      border: "none",
      background: "transparent",
      padding: 0,
      textAlign: "left",
      cursor: "pointer",
    },
    companyAvatar: {
      width: 42,
      height: 42,
      minWidth: 42,
      borderRadius: 12,
      backgroundColor: darkMode ? "#1E3A8A" : "#DBEAFE",
      color: darkMode ? "#BFDBFE" : "#1D4ED8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 18,
      fontWeight: 800,
    },
    recentText: {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      minWidth: 0,
    },
    recentCompany: {
      fontSize: 14,
      color: text,
      fontWeight: 700,
      overflowWrap: "anywhere",
    },
    recentPosition: { fontSize: 12, color: muted, overflowWrap: "anywhere" },
    recentDate: { fontSize: 11, color: muted },
    recentStatus: {
      padding: "7px 10px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      whiteSpace: "nowrap",
    },
    recentEmptyState: {
      padding: "32px 12px",
      textAlign: "center",
      color: muted,
      fontSize: 13,
      lineHeight: 1.7,
    },
    emptyIcon: { fontSize: 30, color: "#3B82F6", marginBottom: 8 },
    emptyTitle: { fontSize: 16, margin: "0 0 8px", color: text },
    addFirstButton: {
      backgroundColor: "#2563EB",
      color: "#FFFFFF",
      border: "none",
      padding: "11px 16px",
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      marginTop: 10,
    },
    chartCard: {
      backgroundColor: card,
      padding: 24,
      borderRadius: 14,
      border: `1px solid ${border}`,
      boxShadow: "0 2px 6px rgba(15,23,42,.03)",
      marginBottom: 28,
      minWidth: 0,
    },
    applicationToolbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 20,
    },
    searchInput: {
      flex: 1,
      minWidth: 180,
      padding: "11px 13px",
      border: `1px solid ${inputBorder}`,
      borderRadius: 9,
      fontSize: 12,
      color: text,
      backgroundColor: inputBg,
      boxSizing: "border-box",
      outline: "none",
    },
    filterSelect: {
      padding: "11px 13px",
      border: `1px solid ${inputBorder}`,
      borderRadius: 9,
      fontSize: 12,
      color: text,
      backgroundColor: inputBg,
      cursor: "pointer",
      minWidth: 145,
    },
    clearButton: {
      backgroundColor: card,
      color: text,
      border: `1px solid ${inputBorder}`,
      padding: "11px 15px",
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    applicationList: { display: "flex", flexDirection: "column", gap: 12 },
    applicationCard: {
      backgroundColor: card,
      color: text,
      padding: 20,
      borderRadius: 12,
      border: `1px solid ${border}`,
      boxShadow: "0 2px 6px rgba(15,23,42,.03)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit",
      width: "100%",
    },
    companyName: { margin: 0, fontSize: 15, fontWeight: 700, color: text },
    position: {
      margin: "6px 0 10px",
      fontSize: 13,
      fontWeight: 500,
      color: muted,
    },
    details: { margin: "5px 0", fontSize: 12, color: muted, lineHeight: 1.5 },
    statusContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 10,
    },
    status: {
      padding: "6px 10px",
      borderRadius: 7,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.3px",
      whiteSpace: "nowrap",
    },
    jobType: { color: muted, fontSize: 11, fontWeight: 500 },
    emptyState: {
      backgroundColor: card,
      border: `1px dashed ${inputBorder}`,
      borderRadius: 12,
      padding: "36px 20px",
      textAlign: "center",
      color: muted,
      fontSize: 13,
      lineHeight: 1.7,
      marginTop: 12,
    },
    pagination: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      marginTop: 24,
      marginBottom: 24,
      flexWrap: "wrap",
    },
    pageButton: {
      backgroundColor: card,
      color: text,
      border: `1px solid ${inputBorder}`,
      padding: "10px 15px",
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    pageText: { color: muted, fontSize: 12 },
    formCard: {
      backgroundColor: card,
      padding: 26,
      borderRadius: 14,
      border: `1px solid ${border}`,
      boxShadow: "0 8px 24px rgba(15,23,42,.06)",
      marginBottom: 28,
      maxWidth: "100%",
      boxSizing: "border-box",
    },
    formHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      marginBottom: 24,
    },
    formTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: text },
    closeButton: {
      backgroundColor: darkMode ? "#334155" : "#F1F5F9",
      color: text,
      border: "none",
      borderRadius: 8,
      width: 34,
      height: 34,
      fontSize: 18,
      cursor: "pointer",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
      gap: 18,
    },
    fullWidth: { gridColumn: "1 / -1" },
    label: {
      display: "block",
      marginBottom: 8,
      fontSize: 12,
      fontWeight: 600,
      color: muted,
    },
    input: {
      width: "100%",
      padding: "12px 13px",
      border: `1px solid ${inputBorder}`,
      borderRadius: 9,
      fontSize: 13,
      color: text,
      backgroundColor: inputBg,
      boxSizing: "border-box",
      outline: "none",
      colorScheme: darkMode ? "dark" : "light",
    },
    textarea: {
      width: "100%",
      minHeight: 100,
      padding: "12px 13px",
      border: `1px solid ${inputBorder}`,
      borderRadius: 9,
      fontSize: 13,
      color: text,
      backgroundColor: inputBg,
      boxSizing: "border-box",
      resize: "vertical",
      fontFamily: "inherit",
      outline: "none",
    },
    formActions: {
      display: "flex",
      justifyContent: "flex-end",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 24,
    },
    cancelButton: {
      backgroundColor: card,
      color: text,
      border: `1px solid ${inputBorder}`,
      padding: "11px 18px",
      borderRadius: 9,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    saveButton: {
      backgroundColor: "#2563EB",
      color: "#FFFFFF",
      border: "none",
      padding: "11px 20px",
      borderRadius: 9,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    errorMessage: {
      backgroundColor: darkMode ? "#450A0A" : "#FEF2F2",
      color: darkMode ? "#FECACA" : "#B91C1C",
      border: `1px solid ${darkMode ? "#7F1D1D" : "#FECACA"}`,
      padding: "12px 14px",
      borderRadius: 9,
      fontSize: 12,
      marginBottom: 20,
    },
    detailsPanel: {
      backgroundColor: card,
      padding: 26,
      borderRadius: 14,
      border: `1px solid ${border}`,
      boxShadow: "0 8px 24px rgba(15,23,42,.06)",
      marginTop: 28,
      marginBottom: 24,
    },
    detailsHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 26,
    },
    detailActions: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    detailsTitle: { margin: 0, fontSize: 21, fontWeight: 750, color: text },
    detailsSubtitle: { margin: "7px 0 0", fontSize: 13, color: muted },
    closeDetailsButton: {
      backgroundColor: darkMode ? "#334155" : "#F1F5F9",
      color: text,
      border: "none",
      borderRadius: 8,
      width: 34,
      height: 34,
      fontSize: 18,
      cursor: "pointer",
    },
    detailsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 22,
    },
    detailLabel: {
      margin: "0 0 8px",
      fontSize: 11,
      fontWeight: 700,
      color: muted,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    detailValue: {
      margin: 0,
      fontSize: 13,
      lineHeight: 1.6,
      color: text,
      overflowWrap: "anywhere",
    },
    jobLink: {
      color: darkMode ? "#93C5FD" : "#2563EB",
      fontSize: 13,
      textDecoration: "none",
      overflowWrap: "anywhere",
    },
    notesValue: {
      margin: 0,
      fontSize: 13,
      lineHeight: 1.7,
      color: muted,
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
    },
    editButton: {
      backgroundColor: "#2563EB",
      color: "#FFFFFF",
      border: "none",
      padding: "10px 15px",
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    deleteButton: {
      backgroundColor: card,
      color: "#DC2626",
      border: "1px solid #FECACA",
      padding: "10px 15px",
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
  };
}

export default App;

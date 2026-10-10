
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

// Production backend URL. You can override this using VITE_API_URL.
const BACKEND_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  "https://findit-lost-found-backend-3.onrender.com"
).replace(/\/+$/, "");

const API = `${BACKEND_ORIGIN}/api/items`;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const categories = [
  "All Categories",
  "Electronics",
  "Accessories",
  "Books",
  "Clothing",
  "Bags",
  "Other",
];

const navigation = [
  { name: "Home", icon: "🏠" },
  { name: "Browse Items", icon: "🔎" },
  { name: "Report Item", icon: "📝" },
  { name: "About", icon: "ℹ️" },
];

const announcements = [
  "🔎 Lost something on campus? Report it on FindIt!",
  "🎒 Found an item? Help return it to its owner.",
  "💙 Together, we can make our campus community stronger.",
  "📍 Include the location to help others identify their items.",
];

const emptyForm = {
  title: "",
  description: "",
  category: "",
  location: "",
  status: "LOST",
  contactInfo: "",
};

function getPhoto(item) {
  if (item.imageUrl) {
    return item.imageUrl.startsWith("http")
      ? item.imageUrl
      : `${BACKEND_ORIGIN}${
          item.imageUrl.startsWith("/") ? "" : "/"
        }${item.imageUrl}`;
  }

  const text =
    `${item.title || ""} ${item.category || ""}`.toLowerCase();

  if (/wallet|purse/.test(text))
    return "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=700&q=80";

  if (/phone|mobile/.test(text))
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=80";

  if (/laptop|computer/.test(text))
    return "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=80";

  if (/bag|backpack/.test(text))
    return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80";

  if (/book|notebook/.test(text))
    return "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=700&q=80";

  if (/watch/.test(text))
    return "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=80";

  if (/earbud|airpod|headphone/.test(text))
    return "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=80";

  return "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?auto=format&fit=crop&w=700&q=80";
}

function StatCard({ icon, label, value, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>Based on current active reports</small>
      </div>
    </article>
  );
}

function App() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [returningId, setReturningId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [activeView, setActiveView] = useState("Home");
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  const [form, setForm] = useState({ ...emptyForm });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  // Load reports from the deployed Spring Boot backend.
  async function loadItems() {
    setLoading(true);

    try {
      const response = await fetch(API);

      if (!response.ok) {
        throw new Error(`Could not load reports (${response.status})`);
      }

      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
      setMessage("");
    } catch (error) {
      console.error("Loading items failed:", error);
      setMessage(
        `Unable to load reports. ${error.message || "Check the backend connection."}`
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnnouncementIndex(
        (current) => (current + 1) % announcements.length
      );
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const activeItems = useMemo(
    () =>
      items.filter(
        (item) =>
          String(item.status || "").toUpperCase() !== "RETURNED"
      ),
    [items]
  );

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const searchable = [
        item.title,
        item.description,
        item.location,
        item.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(
        search.trim().toLowerCase()
      );

      const matchesCategory =
        category === "All Categories" ||
        String(item.category || "").toLowerCase() ===
          category.toLowerCase();

      const matchesStatus =
        status === "ALL" ||
        String(item.status || "").toUpperCase() === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeItems, search, category, status]);

  const lostCount = activeItems.filter(
    (item) => String(item.status || "").toUpperCase() === "LOST"
  ).length;

  const foundCount = activeItems.filter(
    (item) => String(item.status || "").toUpperCase() === "FOUND"
  ).length;

  const categoryCount = new Set(
    activeItems.map((item) => item.category).filter(Boolean)
  ).size;

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageFile(null);
      setImagePreview("");
      event.target.value = "";
      setMessage("Please choose a JPG, PNG, or WebP image.");
      setMessageType("error");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageFile(null);
      setImagePreview("");
      event.target.value = "";
      setMessage("The image must be 5 MB or smaller.");
      setMessageType("error");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  function removePhoto() {
    setImageFile(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleReturn(item) {
    const confirmed = window.confirm(
      `Mark "${item.title}" as returned? It will disappear from active reports.`
    );

    if (!confirmed || returningId !== null) return;

    setReturningId(item.id);
    setMessage("");

    try {
      const response = await fetch(
        `${API}/${item.id}/return`,
        { method: "PUT" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || `Could not update item (${response.status})`
        );
      }

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, status: "RETURNED" }
            : currentItem
        )
      );

      setMessage("Item marked as returned successfully!");
      setMessageType("success");
    } catch (error) {
      console.error("Marking item as returned failed:", error);
      setMessage(
        `Could not mark the item as returned. ${error.message}`
      );
      setMessageType("error");
    } finally {
      setReturningId(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setMessage("");

    if (!["LOST", "FOUND"].includes(form.status)) {
      setMessage("Please select Lost or Found.");
      setMessageType("error");
      return;
    }

    setSubmitting(true);

    try {
      let response;

      if (imageFile) {
        const formData = new FormData();

        formData.append("title", form.title.trim());
        formData.append("description", form.description);
        formData.append("category", form.category);
        formData.append("location", form.location);
        formData.append("status", form.status);
        formData.append("contactInfo", form.contactInfo);
        formData.append("image", imageFile);

        response = await fetch(`${API}/with-image`, {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            title: form.title.trim(),
          }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || `Report submission failed (${response.status})`
        );
      }

      setForm({ ...emptyForm });
      removePhoto();

      await loadItems();

      setMessage(
        imageFile
          ? "Your report and photo were uploaded successfully!"
          : "Your report was submitted successfully!"
      );
      setMessageType("success");
      setActiveView("Home");

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Report submission failed:", error);
      setMessage(`Could not submit your report. ${error.message}`);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setCategory("All Categories");
    setStatus("ALL");
  }

  function goTo(view) {
    setActiveView(view);

    const target =
      view === "Report Item"
        ? "report-form"
        : view === "About"
          ? "about"
          : view === "Browse Items"
            ? "browse-items"
            : "page-top";

    document.getElementById(target)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="portal" id="page-top">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => goTo("Home")}
          aria-label="FindIt home"
        >
          <span className="brand-icon">🔎</span>
          <span>
            <strong>FindIt</strong>
            <small>Lost &amp; Found Matcher</small>
          </span>
        </button>

        <nav className="topnav" aria-label="Main navigation">
          {navigation.map((view) => (
            <button
              key={view.name}
              className={
                activeView === view.name ? "nav-link active" : "nav-link"
              }
              onClick={() => goTo(view.name)}
            >
              <span aria-hidden="true">{view.icon}</span>
              <span>{view.name}</span>
            </button>
          ))}
        </nav>

        <div className="campus-label">
          <span aria-hidden="true">🎓</span> Anurag University
        </div>
      </header>

      <div className="portal-body">
        <aside className="sidebar">
          <div className="side-menu">
            {navigation.map((view) => (
              <button
                key={view.name}
                className={
                  activeView === view.name
                    ? "side-link selected"
                    : "side-link"
                }
                onClick={() => goTo(view.name)}
              >
                <span aria-hidden="true">{view.icon}</span>
                {view.name}
              </button>
            ))}
          </div>

          <div className="sidebar-art">
            <div className="backpack-art">🎒</div>
            <strong>Care. Share. Reunite.</strong>
            <p>
              Together, we can bring lost belongings back home.
            </p>
            <span aria-hidden="true">💙 ✨</span>
          </div>

          <div className="sidebar-note">
            <span className="online-dot" />
            Campus community
          </div>
        </aside>

        <main className="main-content">
          <div className="announcement-bar">
            <span className="announcement-label">
              📢 CAMPUS UPDATES
            </span>
            <div className="marquee-window" aria-live="polite">
              <div
                className="marquee-message"
                key={announcementIndex}
              >
                {announcements[announcementIndex]}
              </div>
            </div>
          </div>

          <section className="welcome-banner">
            <div className="welcome-copy">
              <span className="eyebrow">
                🎓 YOUR CAMPUS, CONNECTED
              </span>
              <h1>Lost something? Found something?</h1>
              <p>
                Welcome to FindIt. Let's help reunite students with
                their belongings and make our campus community stronger.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  onClick={() => goTo("Report Item")}
                >
                  📝 Report an Item <span>→</span>
                </button>
                <button
                  className="outline-button"
                  onClick={() => goTo("Browse Items")}
                >
                  🔎 Browse Items
                </button>
              </div>
            </div>

            <div className="welcome-decoration" aria-hidden="true">
              <span className="deco-circle circle-one" />
              <span className="deco-circle circle-two" />
              <span className="deco-pin">📍</span>
              <span className="deco-heart">💙</span>
            </div>
          </section>

          {message && (
            <div
              className={`notice ${messageType === "success" ? "success" : ""}`}
              role="status"
            >
              <span>{message}</span>
              <button
                onClick={() => setMessage("")}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          <section className="stats-grid" aria-label="Report statistics">
            <StatCard icon="📋" label="Active Reports" value={activeItems.length} tone="blue" />
            <StatCard icon="🔍" label="Lost Items" value={lostCount} tone="orange" />
            <StatCard icon="🎁" label="Found Items" value={foundCount} tone="green" />
            <StatCard icon="🗂️" label="Categories" value={categoryCount} tone="purple" />
          </section>

          <div className="workspace">
            <section className="browse-panel" id="browse-items">
              <div className="section-heading">
                <div>
                  <span className="eyebrow blue-eyebrow">
                    ✨ CAMPUS COMMUNITY
                  </span>
                  <h2>Explore Item Reports</h2>
                  <p>
                    Search and discover reports from around your campus.
                  </p>
                </div>
                <span className="result-count">
                  📄 {filteredItems.length} reports
                </span>
              </div>

              <div className="filter-bar">
                <label className="search-box">
                  <span aria-hidden="true">🔎</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, description, location..."
                    aria-label="Search item reports"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </label>

                <label className="filter-select">
                  <span aria-hidden="true">🗂️</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    aria-label="Filter by category"
                  >
                    {categories.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label className="filter-select status-filter">
                  <span aria-hidden="true">🏷️</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    aria-label="Filter by status"
                  >
                    <option value="ALL">All Status</option>
                    <option value="LOST">Lost Items</option>
                    <option value="FOUND">Found Items</option>
                  </select>
                </label>

                <button className="clear-button" onClick={clearFilters}>
                  🔄 <span>Clear</span>
                </button>
              </div>

              <div className="list-heading">
                <h3>🧾 Recent Reports</h3>
                <button onClick={loadItems} disabled={loading}>
                  🔄 {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {loading ? (
                <div className="empty-state">
                  <span className="empty-icon">⏳</span>
                  <h3>Loading reports...</h3>
                  <p>Retrieving the latest campus reports.</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🔎</span>
                  <h3>No matching reports</h3>
                  <p>
                    Try a different search or clear your filters to see
                    more reports.
                  </p>
                  <button className="primary-button" onClick={clearFilters}>
                    🔄 Clear Filters
                  </button>
                </div>
              ) : (
                <div className="items-grid">
                  {filteredItems.map((item) => {
                    const itemStatus = String(item.status || "").toUpperCase();
                    const isFound = itemStatus === "FOUND";

                    return (
                      <article className="item-card" key={item.id}>
                        <div className="item-photo">
                          <img
                            src={getPhoto(item)}
                            alt={`Photo for ${item.title}`}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src =
                                "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?auto=format&fit=crop&w=700&q=80";
                            }}
                          />
                          <span className={isFound ? "status-badge found" : "status-badge lost"}>
                            {isFound ? "🟢 FOUND" : "🟠 LOST"}
                          </span>
                        </div>

                        <div className="item-details">
                          <h3>{item.title || "Untitled item"}</h3>
                          <p className="item-meta">
                            <span>🗂️</span> {item.category || "Other"}
                          </p>
                          <p className="item-meta">
                            <span>📍</span> {item.location || "Location not specified"}
                          </p>
                          <p className="item-description">
                            {item.description || "No description provided."}
                          </p>
                          <div className="item-contact">
                            <span>💬</span>
                            <span>{item.contactInfo || "Contact not provided"}</span>
                          </div>

                          {item.createdAt && (
                            <p className="item-date">
                              🕒 {new Date(item.createdAt).toLocaleDateString()}
                            </p>
                          )}

                          <button
                            className="submit-button"
                            type="button"
                            disabled={returningId === item.id}
                            onClick={() => handleReturn(item)}
                          >
                            {returningId === item.id
                              ? "Updating..."
                              : "✅ Mark as Returned"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="report-panel" id="report-form">
              <div className="form-heading">
                <div className="form-icon">📝</div>
                <div>
                  <h2>Report an Item</h2>
                  <p>Help an owner find their belongings.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="report-form">
                <label htmlFor="title">Item Name <span>*</span></label>
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={updateForm}
                  placeholder="e.g. Black wallet"
                  required
                />

                <label htmlFor="description">Description <span>*</span></label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  placeholder="Describe the item and its identifying details..."
                  required
                />

                <label htmlFor="category">Category <span>*</span></label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                  required
                >
                  <option value="">Select category</option>
                  {categories.slice(1).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>

                <label htmlFor="location">Location <span>*</span></label>
                <input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={updateForm}
                  placeholder="Where was it lost or found?"
                  required
                />

                <label>Report Type <span>*</span></label>
                <div className="status-choice">
                  <label className={form.status === "LOST" ? "choice lost-choice chosen" : "choice lost-choice"}>
                    <input
                      type="radio"
                      name="status"
                      value="LOST"
                      checked={form.status === "LOST"}
                      onChange={updateForm}
                    />
                    <span>🟠</span> Lost
                  </label>
                  <label className={form.status === "FOUND" ? "choice found-choice chosen" : "choice found-choice"}>
                    <input
                      type="radio"
                      name="status"
                      value="FOUND"
                      checked={form.status === "FOUND"}
                      onChange={updateForm}
                    />
                    <span>🟢</span> Found
                  </label>
                </div>

                <label htmlFor="contactInfo">
                  Contact Information <span>*</span>
                </label>
                <input
                  id="contactInfo"
                  name="contactInfo"
                  type="text"
                  value={form.contactInfo}
                  onChange={updateForm}
                  placeholder="Email or phone number"
                  required
                />

                <div className="photo-note">
                  <span>📸</span>
                  <div>
                    <strong>Upload an item photo</strong>
                    <p>
                      Select a real photo to help others recognize the item.
                      JPG, PNG, or WebP; maximum 5 MB.
                    </p>
                  </div>
                </div>

                <label htmlFor="itemPhoto">
                  Item Photo <span>(optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  id="itemPhoto"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="photo-input"
                />

                {imagePreview && (
                  <div className="photo-preview">
                    <img src={imagePreview} alt="Preview of selected item" />
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={removePhoto}
                    >
                      Remove photo
                    </button>
                  </div>
                )}

                <button
                  className="submit-button"
                  type="submit"
                  disabled={submitting}
                >
                  <span>{submitting ? "⏳" : "🚀"}</span>
                  {submitting
                    ? "Submitting..."
                    : imageFile
                      ? "Submit Report with Photo"
                      : "Submit Report"}
                </button>

                <p className="privacy-note">
                  🔒 Only share contact information you are comfortable
                  making visible to other users.
                </p>
              </form>
            </aside>
          </div>

          <footer className="portal-footer" id="about">
            <strong>🔎 FindIt</strong>
            <span>💙 Built to bring our campus community closer.</span>
            <span>🎓 Anurag University · Lost &amp; Found Matcher</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;

import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000/api";

const emptyAuth = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const emptyVehicle = {
  make: "",
  model: "",
  category: "",
  price: "",
  quantity: "",
};

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [authForm, setAuthForm] = useState(emptyAuth);
  const [vehicles, setVehicles] = useState([]);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState({
    make: "",
    model: "",
    category: "",
    minPrice: "",
    maxPrice: "",
  });

  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);

  const [editingVehicle, setEditingVehicle] = useState(null);
  const [restockVehicleData, setRestockVehicleData] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const token = localStorage.getItem("token");

  // ---------------------------------------------------------
  // MESSAGE
  // ---------------------------------------------------------

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  // ---------------------------------------------------------
  // CHECK LOGIN
  // ---------------------------------------------------------

  useEffect(() => {
    if (token) {
      checkProfile(token);
    }
  }, []);

  // ---------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------

  const checkProfile = async (loginToken) => {
    try {
      const response = await fetch(`${API}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        localStorage.removeItem("token");
        setLoggedIn(false);
        return;
      }

      setLoggedIn(true);
      setIsAdmin(data.role === "admin");

      loadVehicles(loginToken);
    } catch (error) {
      showMessage("Could not connect to the server.", "error");
    }
  };

  // ---------------------------------------------------------
  // AUTH FORM
  // ---------------------------------------------------------

  const handleAuthChange = (e) => {
    setAuthForm({
      ...authForm,
      [e.target.name]: e.target.value,
    });
  };

  // ---------------------------------------------------------
  // LOGIN / REGISTER
  // ---------------------------------------------------------

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (!authForm.email || !authForm.password) {
      showMessage("Please enter email and password.", "error");
      return;
    }

    if (authMode === "register") {
      if (!authForm.name.trim()) {
        showMessage("Please enter your name.", "error");
        return;
      }

      if (authForm.password !== authForm.confirmPassword) {
        showMessage("Passwords do not match.", "error");
        return;
      }
    }

    setLoading(true);

    try {
      const url =
        authMode === "login"
          ? `${API}/auth/login`
          : `${API}/auth/register`;

      const body =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : authForm;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Something went wrong.", "error");
        return;
      }

      if (authMode === "login") {
        localStorage.setItem("token", data.token);

        showMessage("Welcome back! Login successful.");

        setAuthForm(emptyAuth);

        await checkProfile(data.token);
      } else {
        showMessage(
          "Account created successfully. You can login now."
        );

        setAuthMode("login");

        setAuthForm({
          ...emptyAuth,
          email: authForm.email,
        });
      }
    } catch (error) {
      showMessage(
        "Cannot connect to server. Make sure backend is running.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // LOAD VEHICLES
  // ---------------------------------------------------------

  const loadVehicles = async (loginToken = token) => {
    if (!loginToken) return;

    try {
      const response = await fetch(`${API}/vehicles`, {
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Could not load vehicles.", "error");
        return;
      }

      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage("Could not load vehicles.", "error");
    }
  };

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------

  const searchVehicles = async () => {
    try {
      const params = new URLSearchParams();

      if (search.make.trim()) params.append("make", search.make.trim());
      if (search.model.trim()) params.append("model", search.model.trim());
      if (search.category.trim())
        params.append("category", search.category.trim());

      if (search.minPrice !== "")
        params.append("minPrice", search.minPrice);

      if (search.maxPrice !== "")
        params.append("maxPrice", search.maxPrice);

      if ([...params].length === 0) {
        loadVehicles();
        return;
      }

      const response = await fetch(
        `${API}/vehicles/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Search failed.", "error");
        return;
      }

      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage("Search failed.", "error");
    }
  };

  const clearSearch = () => {
    setSearch({
      make: "",
      model: "",
      category: "",
      minPrice: "",
      maxPrice: "",
    });

    loadVehicles();
  };

  // ---------------------------------------------------------
  // PURCHASE
  // ---------------------------------------------------------

  const purchaseVehicle = async (vehicle) => {
    if (vehicle.quantity <= 0) return;

    const confirmed = window.confirm(
      `Purchase ${vehicle.make} ${vehicle.model}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/vehicles/${vehicle.id}/purchase`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Purchase failed.", "error");
        return;
      }

      showMessage(data.message || "Vehicle purchased successfully.");
      loadVehicles();
    } catch (error) {
      showMessage("Purchase failed.", "error");
    }
  };

  // ---------------------------------------------------------
  // ADD VEHICLE
  // ---------------------------------------------------------

  const handleVehicleChange = (e) => {
    setVehicleForm({
      ...vehicleForm,
      [e.target.name]: e.target.value,
    });
  };

  const addVehicle = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/vehicles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          make: vehicleForm.make,
          model: vehicleForm.model,
          category: vehicleForm.category,
          price: Number(vehicleForm.price),
          quantity: Number(vehicleForm.quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Could not add vehicle.", "error");
        return;
      }

      showMessage("Vehicle added successfully.");

      setVehicleForm(emptyVehicle);
      setShowAddModal(false);

      loadVehicles();
    } catch (error) {
      showMessage("Could not add vehicle.", "error");
    }
  };

  // ---------------------------------------------------------
  // UPDATE VEHICLE
  // ---------------------------------------------------------

  const updateVehicle = async (e) => {
    e.preventDefault();

    if (!editingVehicle) return;

    try {
      const response = await fetch(
        `${API}/vehicles/${editingVehicle.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            make: editingVehicle.make,
            model: editingVehicle.model,
            category: editingVehicle.category,
            price: Number(editingVehicle.price),
            quantity: Number(editingVehicle.quantity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Update failed.", "error");
        return;
      }

      showMessage("Vehicle updated successfully.");

      setEditingVehicle(null);
      loadVehicles();
    } catch (error) {
      showMessage("Update failed.", "error");
    }
  };

  // ---------------------------------------------------------
  // DELETE VEHICLE
  // ---------------------------------------------------------

  const deleteVehicle = async (vehicle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${vehicle.make} ${vehicle.model}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/vehicles/${vehicle.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Delete failed.", "error");
        return;
      }

      showMessage("Vehicle deleted successfully.");
      loadVehicles();
    } catch (error) {
      showMessage("Delete failed.", "error");
    }
  };

  // ---------------------------------------------------------
  // RESTOCK
  // ---------------------------------------------------------

  const restockVehicleAction = async (e) => {
    e.preventDefault();

    if (!restockVehicleData) return;

    const quantity = Number(restockVehicleData.quantity);

    if (!quantity || quantity <= 0) {
      showMessage("Enter a valid restock quantity.", "error");
      return;
    }

    try {
      const response = await fetch(
        `${API}/vehicles/${restockVehicleData.id}/restock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || "Restock failed.", "error");
        return;
      }

      showMessage("Inventory restocked successfully.");

      setRestockVehicleData(null);
      loadVehicles();
    } catch (error) {
      showMessage("Restock failed.", "error");
    }
  };

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------

  const logout = () => {
    localStorage.removeItem("token");

    setLoggedIn(false);
    setIsAdmin(false);
    setVehicles([]);
    setShowProfileMenu(false);

    showMessage("You have been logged out.");
  };

  // ---------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------

  const stats = useMemo(() => {
    const totalStock = vehicles.reduce(
      (sum, vehicle) => sum + Number(vehicle.quantity || 0),
      0
    );

    const brands = new Set(
      vehicles.map((vehicle) => vehicle.make)
    ).size;

    const categories = new Set(
      vehicles.map((vehicle) => vehicle.category)
    ).size;

    const lowStock = vehicles.filter(
      (vehicle) =>
        Number(vehicle.quantity) > 0 &&
        Number(vehicle.quantity) <= 5
    ).length;

    return {
      totalVehicles: vehicles.length,
      totalStock,
      brands,
      categories,
      lowStock,
    };
  }, [vehicles]);

  // ---------------------------------------------------------
  // LOGIN / REGISTER PAGE
  // ---------------------------------------------------------

  if (!loggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-background-shape shape-one"></div>
        <div className="auth-background-shape shape-two"></div>

        <div className="auth-wrapper">
          <div className="auth-showcase">
            <div className="brand-mark">
              <span>◆</span>
              DRIVEHUB
            </div>

            <div className="showcase-content">
              <p className="eyebrow">SMART DEALERSHIP PLATFORM</p>

              <h1>
                Find the car
                <br />
                that fits <span>your journey.</span>
              </h1>

              <p>
                A smarter way to discover, manage and purchase
                vehicles from one simple dealership workspace.
              </p>

              <div className="showcase-features">
                <div>
                  <strong>01</strong>
                  <span>Smart inventory</span>
                </div>

                <div>
                  <strong>02</strong>
                  <span>Secure access</span>
                </div>

                <div>
                  <strong>03</strong>
                  <span>Simple purchasing</span>
                </div>
              </div>
            </div>

            <div className="road-visual">
              <div className="car-emoji">🚘</div>
              <div className="road-line"></div>
            </div>
          </div>

          <div className="auth-card">
            <div className="mobile-brand">
              <span>◆</span> DRIVEHUB
            </div>

            <div className="auth-heading">
              <p className="eyebrow">
                {authMode === "login"
                  ? "WELCOME BACK"
                  : "JOIN DRIVEHUB"}
              </p>

              <h2>
                {authMode === "login"
                  ? "Welcome back."
                  : "Start your journey."}
              </h2>

              <p>
                {authMode === "login"
                  ? "Sign in to continue to your dealership workspace."
                  : "Create your account and explore available vehicles."}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setMessage("");
                }}
              >
                Login
              </button>

              <button
                className={authMode === "register" ? "active" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setMessage("");
                }}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <div className="field">
                  <label>Full name</label>
                  <input
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    placeholder="Your name"
                  />
                </div>
              )}

              <div className="field">
                <label>Email address</label>
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  placeholder="you@example.com"
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  placeholder="Enter your password"
                />
              </div>

              {authMode === "register" && (
                <div className="field">
                  <label>Confirm password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={authForm.confirmPassword}
                    onChange={handleAuthChange}
                    placeholder="Repeat your password"
                  />
                </div>
              )}

              {message && (
                <div
                  className={`alert ${
                    messageType === "error"
                      ? "alert-error"
                      : "alert-success"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="primary-button auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : authMode === "login"
                  ? "Enter Dashboard →"
                  : "Create Account →"}
              </button>
            </form>

            <p className="secure-note">
              🔒 Your account is protected with token-based authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------

  return (
    <div className="app-shell">
      {/* NAVIGATION */}

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-symbol">◆</div>

            <div>
              <h1>DRIVEHUB</h1>
              <span>SMART DEALERSHIP</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="role-pill">
              <span className="status-dot"></span>

              {isAdmin ? "Administrator" : "Customer"}
            </div>

            <button
              className="profile-button"
              onClick={() =>
                setShowProfileMenu(!showProfileMenu)
              }
            >
              <span className="avatar">
                {isAdmin ? "A" : "U"}
              </span>

              <span className="profile-name">
                {isAdmin ? "Admin" : "User"}
              </span>

              <span>⌄</span>
            </button>

            {showProfileMenu && (
              <div className="profile-menu">
                <div>
                  <strong>
                    {isAdmin ? "Administrator" : "Customer"}
                  </strong>
                  <small>
                    {isAdmin
                      ? "Inventory management access"
                      : "Vehicle browsing access"}
                  </small>
                </div>

                <button onClick={logout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-container">
        {/* HERO */}

        <section
          className={`dashboard-hero ${
            isAdmin ? "admin-hero" : ""
          }`}
        >
          <div>
            <p className="eyebrow">
              {isAdmin
                ? "DEALERSHIP CONTROL CENTER"
                : "YOUR VEHICLE MARKETPLACE"}
            </p>

            <h2>
              {isAdmin
                ? "Manage your inventory with confidence."
                : "Find your next perfect drive."}
            </h2>

            <p>
              {isAdmin
                ? "Keep your inventory accurate, healthy and ready for customers."
                : "Explore available vehicles and choose the one that matches your journey."}
            </p>
          </div>

          <div className="hero-car">
            <span>🚘</span>
            <div className="hero-glow"></div>
          </div>
        </section>

        {/* STATS */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">🚘</div>

            <div>
              <span>VEHICLES</span>
              <strong>{stats.totalVehicles}</strong>
              <small>Available models</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">📦</div>

            <div>
              <span>IN STOCK</span>
              <strong>{stats.totalStock}</strong>
              <small>Units ready</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">✦</div>

            <div>
              <span>BRANDS</span>
              <strong>{stats.brands}</strong>
              <small>Manufacturers</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">⚡</div>

            <div>
              <span>CATEGORIES</span>
              <strong>{stats.categories}</strong>
              <small>
                {stats.lowStock > 0
                  ? `${stats.lowStock} low-stock`
                  : "Inventory healthy"}
              </small>
            </div>
          </div>
        </section>

        {/* SEARCH */}

        <section className="search-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DISCOVER</p>
              <h3>Find a vehicle</h3>
            </div>

            <span className="result-count">
              {vehicles.length} results
            </span>
          </div>

          <div className="search-grid">
            <input
              placeholder="Make"
              value={search.make}
              onChange={(e) =>
                setSearch({
                  ...search,
                  make: e.target.value,
                })
              }
            />

            <input
              placeholder="Model"
              value={search.model}
              onChange={(e) =>
                setSearch({
                  ...search,
                  model: e.target.value,
                })
              }
            />

            <input
              placeholder="Category"
              value={search.category}
              onChange={(e) =>
                setSearch({
                  ...search,
                  category: e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Min price"
              value={search.minPrice}
              onChange={(e) =>
                setSearch({
                  ...search,
                  minPrice: e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Max price"
              value={search.maxPrice}
              onChange={(e) =>
                setSearch({
                  ...search,
                  maxPrice: e.target.value,
                })
              }
            />

            <button
              className="primary-button search-button"
              onClick={searchVehicles}
            >
              Search
            </button>

            <button
              className="secondary-button"
              onClick={clearSearch}
            >
              Reset
            </button>
          </div>
        </section>

        {/* ADMIN ACTION */}

        {isAdmin && (
          <section className="admin-action-bar">
            <div>
              <p className="eyebrow">ADMIN TOOLS</p>
              <h3>Inventory management</h3>
              <p>Add, update, restock or remove vehicles.</p>
            </div>

            <button
              className="primary-button"
              onClick={() => setShowAddModal(true)}
            >
              + Add Vehicle
            </button>
          </section>
        )}

        {/* VEHICLES */}

        <section className="vehicles-section">
          <div className="section-heading vehicle-heading">
            <div>
              <p className="eyebrow">INVENTORY</p>
              <h3>
                {isAdmin
                  ? "Current inventory"
                  : "Available vehicles"}
              </h3>
            </div>
          </div>

          {vehicles.length === 0 ? (
            <div className="empty-state">
              <div>🔎</div>
              <h3>No vehicles found</h3>
              <p>
                Try changing your search filters or view all
                vehicles.
              </p>

              <button
                className="secondary-button"
                onClick={clearSearch}
              >
                View all vehicles
              </button>
            </div>
          ) : (
            <div className="vehicle-grid">
              {vehicles.map((vehicle, index) => {
                const stock = Number(vehicle.quantity || 0);

                const stockClass =
                  stock === 0
                    ? "out"
                    : stock <= 5
                    ? "low"
                    : "available";

                return (
                  <article
                    className="vehicle-card"
                    key={vehicle.id}
                  >
                    <div className="vehicle-image">
                      <div className="vehicle-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <span className="vehicle-illustration">
                        {vehicle.category
                          ?.toLowerCase()
                          .includes("suv")
                          ? "🚙"
                          : vehicle.category
                              ?.toLowerCase()
                              .includes("sport")
                          ? "🏎️"
                          : "🚘"}
                      </span>

                      <span className={`stock-badge ${stockClass}`}>
                        <span></span>

                        {stock === 0
                          ? "Out of stock"
                          : stock <= 5
                          ? `Only ${stock} left`
                          : `${stock} available`}
                      </span>
                    </div>

                    <div className="vehicle-content">
                      <div className="vehicle-category">
                        {vehicle.category || "Vehicle"}
                      </div>

                      <h4>
                        {vehicle.make} {vehicle.model}
                      </h4>

                      <div className="vehicle-details">
                        <span>
                          <b>Category</b>
                          {vehicle.category}
                        </span>

                        <span>
                          <b>Stock</b>
                          {stock} units
                        </span>
                      </div>

                      <div className="vehicle-footer">
                        <div className="price">
                          ₹
                          {Number(
                            vehicle.price
                          ).toLocaleString("en-IN")}
                        </div>

                        {!isAdmin && (
                          <button
                            className="purchase-button"
                            disabled={stock === 0}
                            onClick={() =>
                              purchaseVehicle(vehicle)
                            }
                          >
                            {stock === 0
                              ? "Unavailable"
                              : "Purchase →"}
                          </button>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="admin-controls">
                          <button
                            className="edit-button"
                            onClick={() =>
                              setEditingVehicle({
                                ...vehicle,
                              })
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="restock-button"
                            onClick={() =>
                              setRestockVehicleData({
                                ...vehicle,
                                quantity: "",
                              })
                            }
                          >
                            Restock
                          </button>

                          <button
                            className="delete-button"
                            onClick={() =>
                              deleteVehicle(vehicle)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* TOAST */}

      {message && (
        <div
          className={`toast ${
            messageType === "error"
              ? "toast-error"
              : "toast-success"
          }`}
        >
          <span>
            {messageType === "error" ? "!" : "✓"}
          </span>

          <p>{message}</p>
        </div>
      )}

      {/* ADD MODAL */}

      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">NEW INVENTORY</p>
                <h3>Add vehicle</h3>
              </div>

              <button
                className="close-button"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={addVehicle}>
              <div className="modal-grid">
                <div className="field">
                  <label>Make</label>
                  <input
                    name="make"
                    value={vehicleForm.make}
                    onChange={handleVehicleChange}
                    placeholder="Toyota"
                    required
                  />
                </div>

                <div className="field">
                  <label>Model</label>
                  <input
                    name="model"
                    value={vehicleForm.model}
                    onChange={handleVehicleChange}
                    placeholder="Camry"
                    required
                  />
                </div>

                <div className="field">
                  <label>Category</label>
                  <input
                    name="category"
                    value={vehicleForm.category}
                    onChange={handleVehicleChange}
                    placeholder="Sedan"
                    required
                  />
                </div>

                <div className="field">
                  <label>Price</label>
                  <input
                    type="number"
                    name="price"
                    value={vehicleForm.price}
                    onChange={handleVehicleChange}
                    placeholder="2700000"
                    min="1"
                    required
                  />
                </div>

                <div className="field full">
                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={vehicleForm.quantity}
                    onChange={handleVehicleChange}
                    placeholder="10"
                    min="0"
                    required
                  />
                </div>
              </div>

              <button className="primary-button modal-submit">
                Add to inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}

      {editingVehicle && (
        <div
          className="modal-overlay"
          onClick={() => setEditingVehicle(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">INVENTORY UPDATE</p>
                <h3>Edit vehicle</h3>
              </div>

              <button
                className="close-button"
                onClick={() => setEditingVehicle(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={updateVehicle}>
              <div className="modal-grid">
                <div className="field">
                  <label>Make</label>
                  <input
                    value={editingVehicle.make}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        make: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>Model</label>
                  <input
                    value={editingVehicle.model}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        model: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>Category</label>
                  <input
                    value={editingVehicle.category}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        category: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>Price</label>
                  <input
                    type="number"
                    value={editingVehicle.price}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        price: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="field full">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={editingVehicle.quantity}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        quantity: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <button className="primary-button modal-submit">
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}

      {restockVehicleData && (
        <div
          className="modal-overlay"
          onClick={() => setRestockVehicleData(null)}
        >
          <div
            className="modal-card small-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">INVENTORY</p>
                <h3>Restock vehicle</h3>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setRestockVehicleData(null)
                }
              >
                ×
              </button>
            </div>

            <div className="restock-preview">
              <span>🚘</span>

              <div>
                <strong>
                  {restockVehicleData.make}{" "}
                  {restockVehicleData.model}
                </strong>

                <small>
                  Current stock:{" "}
                  {restockVehicleData.quantity}
                </small>
              </div>
            </div>

            <form onSubmit={restockVehicleAction}>
              <div className="field">
                <label>Units to add</label>

                <input
                  type="number"
                  min="1"
                  value={restockVehicleData.quantity || ""}
                  onChange={(e) =>
                    setRestockVehicleData({
                      ...restockVehicleData,
                      quantity: e.target.value,
                    })
                  }
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <button className="primary-button modal-submit">
                Restock inventory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
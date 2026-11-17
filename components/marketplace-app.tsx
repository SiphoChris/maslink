"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  Users,
  Wheat,
  X,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AuthScreen } from "@/components/auth-screen";

type Order = {
  id: Id<"orders">;
  createdBy: Id<"users">;
  createdByFarmName: string;
  crop: string;
  quantityKg: number;
  committedKg: number;
  farmerCount: number;
  pricePerKg: number;
  deliveryLocation: string;
  deadline: string;
  notes: string | null;
  joinedByMeKg: number;
  status: "open" | "filled";
};

type FarmProfile = {
  fullName: string;
  farmName: string;
  location: string;
  isComplete: boolean;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 1 }).format(value);
}

function formatDeadline(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MarketplaceApp() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <div className="full-loader"><LoaderCircle className="spin" size={22} /> Connecting to your farm network…</div>;
  }

  return isAuthenticated ? <MarketplaceDashboard /> : <AuthScreen />;
}

function MarketplaceDashboard() {
  const profile = useQuery(api.users.getProfile, {});
  const orders = useQuery(api.marketplace.listOrders, {});
  const updateProfile = useMutation(api.users.updateProfile);
  const createOrder = useMutation(api.marketplace.createOrder);
  const joinOrder = useMutation(api.marketplace.joinOrder);
  const leaveOrder = useMutation(api.marketplace.leaveOrder);
  const { signOut } = useAuthActions();
  const router = useRouter();

  const [activeView, setActiveView] = useState<"nearby" | "all" | "mine" | "farm">("nearby");
  const [search, setSearch] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const allOrders = (orders ?? []) as Order[];
  const openOrderCount = allOrders.filter((order) => order.status === "open").length;
  const term = search.trim().toLocaleLowerCase();
  const filteredOrders = allOrders
    .filter((order) => {
      if (activeView !== "mine" && order.status !== "open") return false;
      if (activeView === "mine" && order.joinedByMeKg <= 0) return false;
      if (activeView === "nearby" && profile?.location) {
        if (!order.deliveryLocation.toLocaleLowerCase().includes(profile.location.toLocaleLowerCase())) {
          return false;
        }
      }
      return (
        !term ||
        order.crop.toLocaleLowerCase().includes(term) ||
        order.deliveryLocation.toLocaleLowerCase().includes(term) ||
        order.createdByFarmName.toLocaleLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const location = profile?.location ?? "";
      const aLocal = a.deliveryLocation.toLocaleLowerCase().includes(location.toLocaleLowerCase());
      const bLocal = b.deliveryLocation.toLocaleLowerCase().includes(location.toLocaleLowerCase());
      return Number(bLocal) - Number(aLocal);
    });

  const totalPledged = allOrders.reduce((sum, order) => sum + order.joinedByMeKg, 0);
  const ordersJoined = allOrders.filter((order) => order.joinedByMeKg > 0).length;
  const committedCount = allOrders.reduce((sum, order) => sum + order.committedKg, 0);
  const locationName = profile?.location || "your area";

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  async function handleProfileSave(values: Omit<FarmProfile, "isComplete">) {
    await updateProfile(values);
    setActiveView("nearby");
    setFeedback({ kind: "success", message: "Your farm profile is ready. Welcome to the network!" });
  }

  async function handleCreateOrder(values: {
    crop: string;
    quantityKg: number;
    pricePerKg: number;
    deliveryLocation: string;
    deadline: string;
    notes?: string;
  }) {
    setBusy(true);
    try {
      await createOrder(values);
      setIsPosting(false);
      setFeedback({ kind: "success", message: "Your order is live. Nearby farmers can now join it." });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not post this order." });
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinOrder(order: Order, quantityKg: number) {
    setBusy(true);
    try {
      await joinOrder({ orderId: order.id, quantityKg });
      setSelectedOrder(null);
      setFeedback({
        kind: "success",
        message: `Your ${formatNumber(quantityKg)} kg is now part of the ${order.crop} pool.`,
      });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not join this order." });
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveOrder(order: Order) {
    setBusy(true);
    try {
      await leaveOrder({ orderId: order.id });
      setFeedback({ kind: "success", message: "Your contribution has been removed from the order." });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not leave this order." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Leaf size={18} strokeWidth={2.2} /></span>
          <span>MASLink</span>
        </div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={`nav-item ${activeView === "nearby" ? "nav-active" : ""}`} onClick={() => { setActiveView("nearby"); setMobileNavOpen(false); }}>
            <MapPin size={17} /> Nearby orders <span className="nav-live-dot" />
          </button>
          <button className={`nav-item ${activeView === "all" ? "nav-active" : ""}`} onClick={() => { setActiveView("all"); setMobileNavOpen(false); }}>
            <Wheat size={17} /> All orders
          </button>
          <button className={`nav-item ${activeView === "mine" ? "nav-active" : ""}`} onClick={() => { setActiveView("mine"); setMobileNavOpen(false); }}>
            <Users size={17} /> My contributions
            {ordersJoined > 0 ? <span className="nav-count">{ordersJoined}</span> : null}
          </button>
        </nav>
        <div className="sidebar-section-label sidebar-section-gap">YOUR FARM</div>
        <button className={`nav-item ${activeView === "farm" ? "nav-active" : ""}`} onClick={() => { setActiveView("farm"); setMobileNavOpen(false); }}>
          <Sprout size={17} /> Farm profile
        </button>
        <div className="sidebar-help">
          <div className="help-icon"><CircleHelp size={17} /></div>
          <strong>Good things grow together.</strong>
          <p>Every kilogram shared helps a local farm reach a bigger market.</p>
        </div>
        <button className="sidebar-user" onClick={handleSignOut}>
          <span className="avatar avatar-sidebar">{getInitials(profile?.farmName || profile?.fullName || "F")}</span>
          <span className="sidebar-user-copy"><strong>{profile?.farmName || "Your farm"}</strong><small>{profile?.location || "Complete your profile"}</small></span>
          <LogOut size={15} className="signout-icon" />
        </button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            <Menu size={19} />
          </button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeView === "farm" ? "Farm profile" : activeView === "mine" ? "My contributions" : activeView === "all" ? "All orders" : "Marketplace"}</strong></div>
          <div className="topbar-actions">
            <div className="location-pill"><MapPin size={14} /><span>{locationName}</span><ChevronDown size={14} /></div>
            <span className="topbar-divider" />
            <button className="icon-button notification-button" aria-label="Help and information"><CircleHelp size={18} /></button>
            <button className="avatar avatar-top" title={profile?.fullName || "Your account"} onClick={handleSignOut}>{getInitials(profile?.fullName || "F")}</button>
          </div>
        </header>

        <div className="page-content">
          {feedback ? (
            <div className={`feedback-banner ${feedback.kind}`} role="status">
              {feedback.kind === "success" ? <Check size={16} /> : <CircleHelp size={16} />}
              <span>{feedback.message}</span>
              <button aria-label="Dismiss message" onClick={() => setFeedback(null)}><X size={15} /></button>
            </div>
          ) : null}

          {profile === undefined || orders === undefined ? (
            <div className="content-loader"><LoaderCircle className="spin" size={21} /> Loading the local market…</div>
          ) : !profile?.isComplete || activeView === "farm" ? (
            <ProfileForm
              profile={profile}
              isSaving={busy}
              onSave={handleProfileSave}
            />
          ) : (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> YOUR LOCAL FARM NETWORK</div>
                  <h1>{activeView === "mine" ? "Your shared harvest" : activeView === "all" ? "Orders that need you" : <>Good morning, {profile.fullName.split(" ")[0]} <span className="heading-sun">✳</span></>}</h1>
                  <p className="page-subtitle">{activeView === "mine" ? "Track the orders you are helping bring to market." : "Pool your produce with nearby farms and unlock bigger orders."}</p>
                </div>
                <button className="button button-primary post-order-button" onClick={() => setIsPosting(true)}>
                  <Plus size={17} /> Post an order
                </button>
              </div>

              <section className="summary-grid" aria-label="Marketplace overview">
                <article className="summary-card summary-card-feature">
                  <div className="summary-top"><span>OPEN OPPORTUNITIES</span><span className="summary-icon summary-icon-green"><Wheat size={17} /></span></div>
                  <div className="summary-value">{openOrderCount}<span className="summary-unit">orders</span></div>
                  <div className="summary-foot"><span className="status-dot" /> Ready for your harvest</div>
                  <div className="summary-decoration"><Leaf size={82} /></div>
                </article>
                <article className="summary-card">
                  <div className="summary-top"><span>YOUR CONTRIBUTION</span><span className="summary-icon summary-icon-sand"><Sprout size={17} /></span></div>
                  <div className="summary-value">{formatNumber(totalPledged)}<span className="summary-unit">kg</span></div>
                  <div className="summary-foot">Across {ordersJoined} {ordersJoined === 1 ? "shared order" : "shared orders"}</div>
                </article>
                <article className="summary-card">
                  <div className="summary-top"><span>ALREADY POOLED</span><span className="summary-icon summary-icon-blue"><Users size={17} /></span></div>
                  <div className="summary-value">{formatNumber(committedCount)}<span className="summary-unit">kg</span></div>
                  <div className="summary-foot"><span className="mini-avatar-stack"><i>F</i><i>F</i><i>F</i></span> Farmers showing up together</div>
                </article>
              </section>

              <section className="market-section">
                <div className="section-heading">
                  <div>
                    <div className="section-title-row"><h2>{activeView === "mine" ? "Orders you have joined" : activeView === "all" ? "All open orders" : "Orders near you"}</h2><span className="live-tag"><span /> LIVE</span></div>
                    <p>{activeView === "mine" ? "Your pledged produce, in one place." : "Small contributions add up to big deliveries."}</p>
                  </div>
                  <button className="text-button" onClick={() => setActiveView(activeView === "all" ? "nearby" : "all")}>
                    {activeView === "all" ? "Show nearby" : "View all orders"} <ArrowRight size={15} />
                  </button>
                </div>

                <div className="market-toolbar">
                  <div className="market-tabs" role="tablist" aria-label="Order filters">
                    <button className={activeView === "nearby" ? "tab-active" : ""} onClick={() => setActiveView("nearby")}>Near me</button>
                    <button className={activeView === "all" ? "tab-active" : ""} onClick={() => setActiveView("all")}>All orders</button>
                    <button className={activeView === "mine" ? "tab-active" : ""} onClick={() => setActiveView("mine")}>Joined by me</button>
                  </div>
                  <div className="toolbar-right">
                    <label className="search-field">
                      <Search size={16} />
                      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search crops or places" aria-label="Search crops or places" />
                      {search ? <button aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button> : null}
                    </label>
                    <button className="filter-button" onClick={() => setActiveView("all")} aria-label="Show all orders"><SlidersHorizontal size={16} /></button>
                  </div>
                </div>

                {filteredOrders.length > 0 ? (
                  <div className="order-grid">
                    {filteredOrders.map((order, index) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        accent={index % 3}
                        isBusy={busy}
                        onJoin={() => setSelectedOrder(order)}
                        onLeave={() => void handleLeaveOrder(order)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-illustration"><Wheat size={27} /></span>
                    <h3>{activeView === "mine" ? "No joined orders yet" : search ? "No orders match your search" : activeView === "nearby" ? `No open orders in ${profile.location} yet` : "Be the first to post an order"}</h3>
                    <p>{activeView === "mine" ? "Browse nearby requests and pledge the produce you can share." : "Post a buyer request or check back soon as nearby farmers add opportunities."}</p>
                    {activeView === "mine" || activeView === "nearby" ? <button className="button button-secondary" onClick={() => setActiveView("all")}>Browse all orders <ArrowRight size={15} /></button> : <button className="button button-primary" onClick={() => setIsPosting(true)}><Plus size={16} /> Post the first order</button>}
                  </div>
                )}
              </section>

              <div className="market-footer"><ShieldCheck size={15} /><span>Every pledge is confirmed before an order closes. Your produce stays yours until delivery is agreed.</span></div>
            </>
          )}
        </div>
      </main>

      {isPosting ? <CreateOrderModal location={profile?.location ?? ""} isBusy={busy} onClose={() => setIsPosting(false)} onCreate={handleCreateOrder} /> : null}
      {selectedOrder ? <JoinOrderModal order={selectedOrder} isBusy={busy} onClose={() => setSelectedOrder(null)} onJoin={handleJoinOrder} /> : null}
      {mobileNavOpen ? <button className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" /> : null}
    </div>
  );
}

function OrderCard({
  order,
  accent,
  isBusy,
  onJoin,
  onLeave,
}: {
  order: Order;
  accent: number;
  isBusy: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const remaining = Math.max(0, order.quantityKg - order.committedKg);
  const percentage = Math.min(100, (order.committedKg / order.quantityKg) * 100);
  const cropClass = ["crop-corn", "crop-tomato", "crop-beans"][accent];
  const cropGlyph = [<Wheat key="corn" size={24} />, <Sprout key="tomato" size={24} />, <Leaf key="beans" size={24} />][accent];

  return (
    <article className="order-card">
      <div className="order-card-head">
        <div className={`crop-illustration ${cropClass}`}>{cropGlyph}</div>
        <span className={`order-badge ${order.status === "filled" ? "order-badge-filled" : ""}`}>
          <span /> {order.status === "filled" ? "FULLY POOLED" : "OPEN TO JOIN"}
        </span>
        <button className="order-more" title="Order details"><CircleHelp size={17} /></button>
      </div>
      <div className="order-title-row">
        <div><h3>{order.crop}</h3><span className="order-origin">Requested by {order.createdByFarmName}</span></div>
        <div className="unit-price"><strong>R{formatNumber(order.pricePerKg)}</strong><small>/ kg</small></div>
      </div>
      <div className="order-progress-label"><span><strong>{formatNumber(order.committedKg)} kg</strong> pooled</span><span>{formatNumber(order.quantityKg)} kg goal</span></div>
      <div className="progress-track"><span style={{ width: `${percentage}%` }} /></div>
      <div className="order-meta">
        <span><MapPin size={14} />{order.deliveryLocation}</span>
        <span><CalendarDays size={14} />By {formatDeadline(order.deadline)}</span>
      </div>
      <div className="order-community">
        <span className="farmer-stack"><i>{getInitials(order.createdByFarmName) || "F"}</i>{order.farmerCount > 1 ? <i>+{order.farmerCount - 1}</i> : null}</span>
        <span>{order.farmerCount} {order.farmerCount === 1 ? "farmer" : "farmers"} in the pool</span>
        {order.joinedByMeKg > 0 ? <span className="you-joined"><Check size={12} /> You: {formatNumber(order.joinedByMeKg)}kg</span> : null}
      </div>
      {order.notes ? <p className="order-notes">{order.notes}</p> : null}
      <div className="order-card-bottom">
        <div className="remaining-copy"><span>{formatNumber(remaining)} kg</span> still needed</div>
        {order.status === "filled" ? (
          <span className="filled-label"><Check size={13} /> Order filled</span>
        ) : order.joinedByMeKg > 0 ? (
          <button className="button button-small button-leave" onClick={onLeave} disabled={isBusy}>Leave pool</button>
        ) : (
          <button className="button button-small button-join" onClick={onJoin} disabled={remaining <= 0 || isBusy}>Join this order <ArrowRight size={14} /></button>
        )}
      </div>
    </article>
  );
}

function ProfileForm({
  profile,
  isSaving,
  onSave,
}: {
  profile: FarmProfile | null;
  isSaving: boolean;
  onSave: (values: Omit<FarmProfile, "isComplete">) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [farmName, setFarmName] = useState(profile?.farmName ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [error, setError] = useState<string | null>(null);
  const isEditing = profile?.isComplete;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onSave({ fullName, farmName, location });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your profile.");
    }
  }

  return (
    <section className="profile-setup">
      <div className="profile-setup-aside">
        <div className="profile-setup-icon"><Sprout size={26} /></div>
        <span className="eyebrow eyebrow-light">YOUR FARM, YOUR NETWORK</span>
        <h1>{isEditing ? "Your farm profile" : "Let’s get your farm on the map."}</h1>
        <p>Farmers nearby use your location to find orders they can fulfill together. You’re always in control of what you share.</p>
        <div className="profile-promise"><ShieldCheck size={16} /><span>Only your farm name and area are shown on order listings.</span></div>
      </div>
      <form className="profile-form" onSubmit={submit}>
        <div className="profile-form-heading"><span className="eyebrow">FARM DETAILS</span><h2>{isEditing ? "Update your details" : "Create your farm profile"}</h2><p>It only takes a moment to find your people.</p></div>
        <label>Full name<input required minLength={2} maxLength={70} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Thandi Mokoena" /></label>
        <label>Farm or cooperative name<input required minLength={2} maxLength={70} value={farmName} onChange={(event) => setFarmName(event.target.value)} placeholder="e.g. Green Valley Farm" /></label>
        <label>Town or farming area<div className="input-with-icon"><MapPin size={16} /><input required minLength={2} maxLength={80} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Stellenbosch, Western Cape" /></div></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button button-primary profile-submit" type="submit" disabled={isSaving}>
          {isSaving ? <span className="spinner" /> : <Check size={17} />}
          {isSaving ? "Saving profile…" : isEditing ? "Save changes" : "Continue to marketplace"}
        </button>
        <p className="profile-hint">You can change your details any time from your farm profile.</p>
      </form>
    </section>
  );
}

function CreateOrderModal({
  location,
  isBusy,
  onClose,
  onCreate,
}: {
  location: string;
  isBusy: boolean;
  onClose: () => void;
  onCreate: (values: {
    crop: string;
    quantityKg: number;
    pricePerKg: number;
    deliveryLocation: string;
    deadline: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const [crop, setCrop] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState(location);
  const [deadline, setDeadline] = useState(nextWeek.toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onCreate({
        crop,
        quantityKg: Number(quantityKg),
        pricePerKg: Number(pricePerKg),
        deliveryLocation,
        deadline,
        notes: notes || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not post this order.");
    }
  }

  return (
    <Modal onClose={onClose} title="Post a produce order">
      <div className="modal-intro"><span className="modal-icon"><Wheat size={19} /></span><div><h2>Post a produce order</h2><p>Nearby farms can pledge what they have to help fill it.</p></div></div>
      <form className="modal-form" onSubmit={submit}>
        <label>What produce do you need?<input autoFocus required maxLength={50} value={crop} onChange={(event) => setCrop(event.target.value)} placeholder="e.g. Sweet corn" /></label>
        <div className="form-row">
          <label>Total quantity<input required min="0.1" step="0.1" type="number" value={quantityKg} onChange={(event) => setQuantityKg(event.target.value)} placeholder="e.g. 150" /><small>kilograms</small></label>
          <label>Price per kg<input required min="0.01" step="0.01" type="number" value={pricePerKg} onChange={(event) => setPricePerKg(event.target.value)} placeholder="e.g. 12.50" /><small>South African rand</small></label>
        </div>
        <div className="form-row">
          <label>Delivery area<input required maxLength={80} value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.target.value)} placeholder="Town or farming area" /></label>
          <label>Needed by<input required type="date" min={new Date().toISOString().slice(0, 10)} value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
        </div>
        <label>Extra details <span className="optional-label">OPTIONAL</span><textarea maxLength={240} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Grade, packaging, collection details…" /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={isBusy}>{isBusy ? <span className="spinner" /> : <Plus size={16} />}{isBusy ? "Posting…" : "Publish order"}</button></div>
      </form>
    </Modal>
  );
}

function JoinOrderModal({
  order,
  isBusy,
  onClose,
  onJoin,
}: {
  order: Order;
  isBusy: boolean;
  onClose: () => void;
  onJoin: (order: Order, quantityKg: number) => Promise<void>;
}) {
  const remaining = Math.max(0, order.quantityKg - order.committedKg);
  const [quantityKg, setQuantityKg] = useState(String(Math.min(10, remaining)));
  const [error, setError] = useState<string | null>(null);
  const amount = Number(quantityKg);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onJoin(order, amount);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join this order.");
    }
  }

  return (
    <Modal onClose={onClose} title={`Join ${order.crop} order`}>
      <div className="modal-intro"><span className="modal-icon modal-icon-crop"><Leaf size={19} /></span><div><h2>Join the {order.crop} pool</h2><p>Every contribution brings this order closer to its goal.</p></div></div>
      <div className="join-order-summary"><span><MapPin size={15} />{order.deliveryLocation}</span><span><Users size={15} />{order.farmerCount} farms in</span><div className="join-progress"><span style={{ width: `${Math.min(100, (order.committedKg / order.quantityKg) * 100)}%` }} /></div><div className="join-progress-meta"><span>{formatNumber(order.committedKg)} kg pledged</span><strong>{formatNumber(remaining)} kg still needed</strong></div></div>
      <form className="modal-form" onSubmit={submit}>
        <label>How much can your farm contribute?<div className="quantity-input"><input autoFocus required min="0.1" max={remaining} step="0.1" type="number" value={quantityKg} onChange={(event) => setQuantityKg(event.target.value)} /><span>kg</span></div></label>
        {amount > 0 && amount <= remaining ? <p className="pledge-estimate">Estimated order value: <strong>R{formatNumber(amount * order.pricePerKg)}</strong></p> : null}
        <p className="pledge-note"><ShieldCheck size={15} /> Your pledge is a commitment request. Confirm timing and collection with the other farms before delivery.</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Not now</button><button type="submit" className="button button-primary" disabled={isBusy || amount <= 0 || amount > remaining}>{isBusy ? <span className="spinner" /> : <ArrowRight size={16} />}{isBusy ? "Joining…" : "Confirm my contribution"}</button></div>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <button className="modal-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        {children}
      </section>
    </div>
  );
}

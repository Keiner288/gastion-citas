import { useEffect, useState, useMemo } from "react";
import { useAppointments } from "../hooks/useAppointments";
import { useAuth } from "../../../providers/AuthProvider";
import { Calendar, Clock, CheckCircle, AlertCircle, TrendingUp, XCircle, User, History, Users, GitBranch, List, UserPlus } from "lucide-react";
import UserAvatar from "../../../shared/components/UserAvatar";
import UserSidebar from "../../../shared/components/UserSidebar";
import { SearchSidebar } from "../../../shared/components/SearchSidebar";
import { Skeleton } from "../../../shared/components/Skeleton";
import { EmptyState } from "../../../shared/components/EmptyState";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const INTERVENTION_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "family", label: "Familiar" },
  { value: "community", label: "Comunitaria" },
  { value: "group", label: "Grupal" },
];

const REFERRAL_SOURCES = [
  { value: "self", label: "Autosolicitud" },
  { value: "professor", label: "Docente" },
  { value: "coordinator", label: "Coordinador" },
  { value: "peers", label: "Compañeros" },
  { value: "other", label: "Otro" },
];

const FILTERS = [
  { value: "", label: "Todas", Icon: List },
  { value: "pending", label: "Pendientes", Icon: AlertCircle },
  { value: "confirmed", label: "Confirmadas", Icon: Clock },
  { value: "completed", label: "Historial", Icon: CheckCircle },
];

export default function SocialWorkDashboard() {
  const { appointments, fetchMyAppointments, fetchApprenticeHistory, updateAppointment, updateStatus, takeAppointment, isLoading, searchFilters, updateSearchFilters, clearSearchFilters, fetchWithSearch } = useAppointments();
  const { profile } = useAuth();
  const [filter, setFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchSidebarOpen, setSearchSidebarOpen] = useState(false);
  const [cardStates, setCardStates] = useState({});
  const [historyModal, setHistoryModal] = useState(null);
  const [apprenticeHistory, setApprenticeHistory] = useState([]);

  const getCardState = (aptId) => cardStates[aptId] || {
    notes: "",
    interventionType: "individual",
    referralSource: "self",
    referralDetails: "",
  };

  const updateCardState = (aptId, field, value) => {
    setCardStates(prev => ({
      ...prev,
      [aptId]: { ...getCardState(aptId), [field]: value },
    }));
  };

  useEffect(() => { fetchMyAppointments(); }, [profile, fetchMyAppointments]);

  const handleSearch = () => {
    fetchWithSearch();
  };

  const handleFilterChange = (newFilters) => {
    updateSearchFilters(newFilters);
  };

  const handleClearFilters = () => {
    clearSearchFilters();
    fetchMyAppointments();
  };

  const stats = useMemo(() => ({
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  }), [appointments]);

  const completionRate = appointments.length > 0 ? Math.round((stats.completed / appointments.length) * 100) : 0;

  const filteredAppointments = useMemo(() => {
    if (!filter) return appointments;
    return appointments.filter((apt) => apt.status === filter);
  }, [appointments, filter]);

  const handleConfirm = async (id) => { await updateStatus(id, "confirmed"); };
  const handleShow = async (id) => { await updateStatus(id, "no_show"); };
  const handleTake = async (id) => { await takeAppointment(id); };

  const handleComplete = async (id) => {
    const cs = getCardState(id);
    if (!cs.notes.trim()) return;
    const interventionData = JSON.stringify({
      plan: cs.notes,
      intervention_type: cs.interventionType,
      referral_source: cs.referralSource,
      referral_details: cs.referralDetails || null,
    });
    const result = await updateAppointment(id, {
      status: "completed",
      notes: interventionData,
    });
    if (result.success) {
      setCardStates(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const openHistory = async (userId) => {
    setApprenticeHistory(await fetchApprenticeHistory(userId, profile.dependency_id));
    setHistoryModal(userId);
  };

  return (
    <div className="dashboard-layout">
      <SearchSidebar
        filters={searchFilters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onSearch={handleSearch}
        isOpen={searchSidebarOpen}
        onToggle={() => setSearchSidebarOpen(!searchSidebarOpen)}
      />

      <div className="dashboard-main">
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div>
              <h1>{profile?.dependencies?.name || "Trabajo Social"}</h1>
              <p>{profile?.full_name || "Profesional"} — Panel de trabajo social</p>
            </div>
            <div className="header-actions">
              <UserAvatar name={profile?.full_name} onClick={() => setSidebarOpen(true)} />
            </div>
          </header>

      <div className="bento" style={{ marginBottom: "var(--space-md)" }}>
        <div className="card card--flat">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
            <AlertCircle size={16} aria-hidden="true" /><span style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>Pendientes</span>
          </div>
          <div style={{ fontSize: "var(--text-h1)", fontWeight: 700 }}>{stats.pending}</div>
        </div>
        <div className="card card--flat">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
            <Clock size={16} aria-hidden="true" /><span style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>Confirmadas</span>
          </div>
          <div style={{ fontSize: "var(--text-h1)", fontWeight: 700 }}>{stats.confirmed}</div>
        </div>
        <div className="card card--flat">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
            <CheckCircle size={16} aria-hidden="true" /><span style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>Completadas</span>
          </div>
          <div style={{ fontSize: "var(--text-h1)", fontWeight: 700 }}>{stats.completed}</div>
        </div>
        <div className="card card--flat">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-xs)" }}>
            <TrendingUp size={16} aria-hidden="true" /><span style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>Cumplimiento</span>
          </div>
          <div style={{ fontSize: "var(--text-h1)", fontWeight: 700 }}>{completionRate}%</div>
        </div>
      </div>

      <nav className="prof-filter-tabs" role="tablist">
        {FILTERS.map((f) => {
          const FilterIcon = f.Icon;
          return (
            <button key={f.value} className={`pill ${filter === f.value ? "pill--active" : ""}`} onClick={() => setFilter(f.value)} role="tab" aria-selected={filter === f.value}>
              <FilterIcon size={14} aria-hidden="true" />{f.label}
              <span className="badge badge--sm" style={{ background: filter !== f.value ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.2)", color: filter === f.value ? "white" : undefined }}>
                {f.value === "" ? appointments.length : stats[f.value]}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="bento">
        {isLoading && filteredAppointments.length === 0 ? (
          <div className="card card--elevated card--span-2"><Skeleton variant="card" height="200px" count={3} /></div>
        ) : filteredAppointments.length === 0 ? (
          <div className="card card--elevated card--span-2">
            <EmptyState icon={Calendar} title="No hay citas registradas" description="Pendientes de asignación" />
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div key={apt.id} className="card card--flat">
              <div className="card__header">
                {apt.dependencies?.name && (
                  <span className="badge" style={{ background: `${apt.dependencies?.color}1a`, color: apt.dependencies?.color }}>{apt.dependencies.name}</span>
                )}
                <div style={{ display: "flex", gap: "var(--space-xs)", alignItems: "center", flexWrap: "wrap" }}>
                  {apt.intervention_type && (
                    <span className="badge badge--sm"><Users size={12} aria-hidden="true" /> {INTERVENTION_TYPES.find(t => t.value === apt.intervention_type)?.label}</span>
                  )}
                  <span className={`badge badge--${apt.status}`}>{apt.status}</span>
                </div>
              </div>

              {apt.profiles?.full_name && (
                <div className="card__body" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-sm)", flexWrap: "wrap" }}>
                  <User size={14} aria-hidden="true" /><span style={{ fontWeight: 600 }}>{apt.profiles.full_name}</span>
                  {apt.profiles.document_number && <span style={{ color: "var(--text-muted)", fontSize: "var(--text-small)" }}>— Doc: {apt.profiles.document_number}</span>}
                  {apt.professional_id === profile.id && <span className="badge badge--sm" style={{ background: "var(--color-success)", color: "white" }}><CheckCircle size={10} /> Mía</span>}
                  {!apt.professional_id && <span className="badge badge--sm" style={{ background: "var(--color-warning)", color: "white" }}>Sin asignar</span>}
                </div>
              )}

              <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)", fontSize: "var(--text-small)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}><Calendar size={14} aria-hidden="true" /><span>{format(parseISO(apt.scheduled_date), "PPP", { locale: es })}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}><Clock size={14} aria-hidden="true" /><span>{apt.scheduled_time}</span></div>
              </div>

              <div className="card__body" style={{ marginTop: "var(--space-xs)" }}><p style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)" }}>{apt.reason || "Sin motivo registrado"}</p></div>

              {apt.notes && (() => {
                let parsed;
                try { parsed = JSON.parse(apt.notes); } catch { parsed = null; }
                return (
                  <div className="card__body" style={{ marginTop: "var(--space-xs)", padding: "var(--space-sm)", background: "var(--neutral-100)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-small)" }}>
                    <div><strong>Plan:</strong> {parsed?.plan || apt.notes}</div>
                    {parsed?.intervention_type && <div><strong>Tipo:</strong> {INTERVENTION_TYPES.find(t => t.value === parsed.intervention_type)?.label || parsed.intervention_type}</div>}
                    {parsed?.referral_source && <div><strong>Derivación:</strong> {REFERRAL_SOURCES.find(r => r.value === parsed.referral_source)?.label || parsed.referral_source}</div>}
                    {parsed?.referral_details && <div><strong>Detalles:</strong> {parsed.referral_details}</div>}
                  </div>
                );
              })()}

              {apt.profiles?.full_name && (
                <div className="card__actions" style={{ marginTop: "var(--space-sm)" }}>
                  <button onClick={() => openHistory(apt.user_id)} className="btn btn-ghost btn--sm"><History size={12} aria-hidden="true" /> Ver historial</button>
                </div>
              )}

              {filter === "pending" && (
                <div className="card__footer" style={{ gap: "var(--space-sm)" }}>
                  {apt.professional_id === profile.id ? (
                    <>
                      <button onClick={() => handleConfirm(apt.id)} className="btn btn-success" style={{ flex: 1 }}><CheckCircle size={16} aria-hidden="true" /> Confirmar</button>
                      <button onClick={() => handleShow(apt.id)} className="btn btn-secondary" style={{ flex: 1 }}><XCircle size={16} aria-hidden="true" /> No Asistió</button>
                    </>
                  ) : (
                    <button onClick={() => handleTake(apt.id)} className="btn btn-primary" style={{ flex: 1, width: "100%" }}><UserPlus size={16} aria-hidden="true" /> Tomar cita</button>
                  )}
                </div>
              )}

              {filter === "confirmed" && (
                <div className="card__footer" style={{ flexDirection: "column", gap: "var(--space-sm)" }}>
                  <div className="field-row field-row--2">
                    <div className="field field--static">
                      <label className="field__label"><Users size={12} /> Tipo</label>
                      <select className="field__input" value={getCardState(apt.id).interventionType} onChange={(e) => updateCardState(apt.id, "interventionType", e.target.value)}>
                        {INTERVENTION_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </select>
                    </div>
                    <div className="field field--static">
                      <label className="field__label"><GitBranch size={12} /> Derivación</label>
                      <select className="field__input" value={getCardState(apt.id).referralSource} onChange={(e) => updateCardState(apt.id, "referralSource", e.target.value)}>
                        {REFERRAL_SOURCES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                      </select>
                    </div>
                  </div>
                  {getCardState(apt.id).referralSource !== "self" && (
                    <input className="field__input" type="text" placeholder="Detalles de la derivación" value={getCardState(apt.id).referralDetails} onChange={(e) => updateCardState(apt.id, "referralDetails", e.target.value)} />
                  )}
                  <textarea className="field__input" placeholder="Plan de intervención (obligatorio)" value={getCardState(apt.id).notes} onChange={(e) => updateCardState(apt.id, "notes", e.target.value)} rows={2} style={{ minHeight: "60px" }} />
                  <button onClick={() => handleComplete(apt.id)} className="btn btn-primary btn--block" disabled={!getCardState(apt.id).notes.trim()}><CheckCircle size={16} aria-hidden="true" /> Completar Intervención</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <h2><History size={20} aria-hidden="true" /> Historial de Atención</h2>
            {apprenticeHistory.length > 0 ? (
              <div className="history-timeline">
                {apprenticeHistory.map((apt) => (
                  <div key={apt.id} className={`history-item ${apt.status}`}>
                    <div className="history-item-content">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{format(parseISO(apt.scheduled_date), "PPP", { locale: es })} - {apt.scheduled_time}</span>
                        <span className="badge badge--sm" style={{ background: `${apt.dependencies?.color}1a`, color: apt.dependencies?.color }}>{apt.dependencies?.name || "-"}</span>
                      </div>
                      <p style={{ fontSize: "var(--text-small)", color: "var(--text-secondary)", marginTop: "var(--space-xs)" }}>{apt.reason || "Sin motivo"}</p>
                      {apt.notes && (() => {
                        let parsed;
                        try { parsed = JSON.parse(apt.notes); } catch { parsed = null; }
                        return <p style={{ fontSize: "var(--text-small)", fontStyle: "italic", color: "var(--text-muted)" }}>Plan: {parsed?.plan || apt.notes}</p>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={History} title="Sin historial" description="Este aprendiz no tiene citas registradas" compact />}
            <button className="btn btn-secondary btn--block" onClick={() => setHistoryModal(null)} style={{ marginTop: "var(--space-md)" }}>Cerrar</button>
          </div>
        </div>
      )}

      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} appointments={appointments} />
        </div>
      </div>
    </div>
  );
}

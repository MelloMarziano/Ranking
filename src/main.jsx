import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  GripVertical,
  Link2,
  LogIn,
  LogOut,
  MessageCircle,
  Pencil,
  Plus,
  ShoppingBag,
  Smile,
  Star,
  Trash2,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { hasFirebaseConfig } from "./firebase";
import { getUsernameFromEmail, signInAdmin, signOutAdmin, watchAdminSession } from "./authService";
import { employees as seedEmployees, questions as seedQuestions } from "./data";
import {
  getEmployees,
  getEvaluations,
  getQuestions,
  hasLegacyEmployeeId,
  migrateEmployeeToGeneratedId,
  saveEmployee,
  saveEvaluation,
  saveQuestion,
  updateQuestionStatus,
} from "./firestoreService";
import "./styles.css";

function buildRanking(employees, evaluations) {
  const grouped = evaluations.reduce((summary, evaluation) => {
    if (!evaluation.employeeId || typeof evaluation.score !== "number") {
      return summary;
    }

    const current = summary[evaluation.employeeId] ?? { total: 0, reviews: 0 };
    summary[evaluation.employeeId] = {
      total: current.total + evaluation.score,
      reviews: current.reviews + 1,
    };

    return summary;
  }, {});

  return employees
    .map((employee) => {
      const metrics = grouped[employee.id] ?? { total: 0, reviews: 0 };
      const score = metrics.reviews ? metrics.total / metrics.reviews : 0;

      return {
        ...employee,
        score,
        reviews: metrics.reviews,
      };
    })
    .sort((first, second) => second.score - first.score || second.reviews - first.reviews || first.name.localeCompare(second.name));
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function getPreviousMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

function parseDateInput(value, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function getEvaluationDate(evaluation) {
  if (evaluation.createdAt?.toDate) {
    return evaluation.createdAt.toDate();
  }

  if (evaluation.createdAt instanceof Date) {
    return evaluation.createdAt;
  }

  return null;
}

function filterEvaluationsByDate(evaluations, dateRange) {
  const start = parseDateInput(dateRange.start);
  const end = parseDateInput(dateRange.end, true);

  return evaluations.filter((evaluation) => {
    const createdAt = getEvaluationDate(evaluation);
    return createdAt && createdAt >= start && createdAt <= end;
  });
}

function formatDisplayDate(value) {
  return parseDateInput(value).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function useDashboardData({ admin = false } = {}) {
  const [employees, setEmployees] = useState(seedEmployees);
  const [questions, setQuestions] = useState(seedQuestions);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    const [employeeItems, questionItems, evaluationItems] = await Promise.all([
      getEmployees({ seed: admin }),
      getQuestions({ seed: admin }),
      admin ? getEvaluations() : [],
    ]);

    setEmployees(employeeItems);
    setQuestions(questionItems);
    setEvaluations(evaluationItems);
    setError("");
  };

  useEffect(() => {
    let mounted = true;

    // La encuesta es pública: solo lee empleados y preguntas. Las evaluaciones son solo para el admin.
    Promise.all([getEmployees({ seed: admin }), getQuestions({ seed: admin }), admin ? getEvaluations() : []])
      .then(([employeeItems, questionItems, evaluationItems]) => {
        if (!mounted) return;
        setEmployees(employeeItems);
        setQuestions(questionItems);
        setEvaluations(evaluationItems);
        setError("");
      })
      .catch((dataError) => {
        console.error(dataError);
        if (!mounted) return;
        setError("No se pudieron cargar los datos desde Firebase.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [admin]);

  const ranking = useMemo(() => buildRanking(employees, evaluations), [employees, evaluations]);
  const totalReviews = evaluations.length;
  const average = totalReviews
    ? evaluations.reduce((sum, evaluation) => sum + (typeof evaluation.score === "number" ? evaluation.score : 0), 0) /
      totalReviews
    : 0;

  return {
    employees,
    questions,
    setQuestions,
    evaluations,
    ranking,
    totalReviews,
    average,
    loading,
    error,
    refresh,
  };
}

// La app puede vivir en una subcarpeta (ej. GitHub Pages: /Ranking/), así que las rutas parten de BASE_URL.
const appPath = (path = "") => `${import.meta.env.BASE_URL}${path}`;
const LOGO_URL = appPath("assets/arturo-hookah-logo-cropped.png");

function Logo({ className = "brand" }) {
  return (
    <a className={className} href={appPath("admin")} aria-label="Ir al panel admin">
      <img src={LOGO_URL} alt="Arturo Hookah" />
    </a>
  );
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ src, name, size = 44 }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (!src || failed) {
    return (
      <span aria-label={name} className="avatar avatar-fallback" role="img" style={style}>
        {getInitials(name) || "?"}
      </span>
    );
  }

  return <img alt={name} className="avatar" onError={() => setFailed(true)} src={src} style={style} />;
}

function StepProgress({ step, total = 3 }) {
  return (
    <div className="step-progress" aria-label={`Paso ${step} de ${total}`}>
      <div className="step-progress-track">
        {Array.from({ length: total }).map((_, index) => (
          <span className={index < step ? "done" : ""} key={index} />
        ))}
      </div>
      <span>
        Paso {step} de {total}
      </span>
    </div>
  );
}

function Stars({ value = 0, interactive = false, onChange, label }) {
  if (!interactive) {
    return (
      <div className="stars" aria-label={`${value.toFixed(1)} de 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star className={star <= Math.round(value) ? "star filled" : "star"} key={star} size={14} />
        ))}
      </div>
    );
  }

  return (
    <div className="stars interactive" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          aria-checked={star === value}
          aria-label={`${star} de 5`}
          className={star <= value ? "star filled" : "star"}
          key={star}
          onClick={() => onChange?.(star)}
          role="radio"
          type="button"
        >
          <Star size={30} />
        </button>
      ))}
    </div>
  );
}

function ScoreBar({ value }) {
  return (
    <div className="score-bar" aria-hidden="true">
      <span style={{ width: `${(value / 5) * 100}%` }} />
    </div>
  );
}

function Stat({ icon, label, value, detail }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

const defaultAvatar =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80";

function Dialog({ title, children, onClose }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button aria-label="Cerrar" className="modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function EmployeeForm({ employee, order, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    role: employee?.role ?? "Vendedor",
    avatar: employee?.avatar ?? defaultAvatar,
    status: employee?.status ?? "Activo",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.role.trim()) {
      setError("Escribe el nombre y el puesto del empleado.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await saveEmployee({
        ...form,
        id: employee?.id,
        order: employee?.order ?? order,
      });
      await onSaved();
      onClose();
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar el empleado. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="modal-form" onSubmit={submit}>
      {error && <p className="form-error">{error}</p>}
      <div className="avatar-preview">
        <Avatar name={form.name || "Nuevo"} size={56} src={form.avatar} />
        <span>Vista previa de la foto</span>
      </div>
      <label>
        Nombre
        <input autoFocus value={form.name} onChange={(event) => updateField("name", event.target.value)} />
      </label>
      <label>
        Puesto
        <input value={form.role} onChange={(event) => updateField("role", event.target.value)} />
      </label>
      <label>
        URL de la foto
        <input value={form.avatar} onChange={(event) => updateField("avatar", event.target.value)} />
      </label>
      <label>
        Estado
        <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </label>
      <div className="modal-actions">
        <button className="button button-ghost" onClick={onClose} type="button">
          Cancelar
        </button>
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? "Guardando..." : "Guardar empleado"}
        </button>
      </div>
    </form>
  );
}

function QuestionForm({ question, order, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: question?.title ?? "",
    description: question?.description ?? "",
    active: question?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      setError("Escribe la pregunta y el texto de ayuda.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await saveQuestion({
        ...form,
        id: question?.id,
        order: question?.order ?? order,
      });
      await onSaved();
      onClose();
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar la pregunta. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="modal-form" onSubmit={submit}>
      {error && <p className="form-error">{error}</p>}
      <label>
        Pregunta
        <input autoFocus value={form.title} onChange={(event) => updateField("title", event.target.value)} />
      </label>
      <label>
        Texto de ayuda
        <input value={form.description} onChange={(event) => updateField("description", event.target.value)} />
      </label>
      <label className="checkbox-line">
        <input
          checked={form.active}
          onChange={(event) => updateField("active", event.target.checked)}
          type="checkbox"
        />
        Mostrar en la encuesta
      </label>
      <div className="modal-actions">
        <button className="button button-ghost" onClick={onClose} type="button">
          Cancelar
        </button>
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? "Guardando..." : "Guardar pregunta"}
        </button>
      </div>
    </form>
  );
}

function DateRangeForm({ initialRange, onApply, onClose }) {
  const [range, setRange] = useState(initialRange);
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();

    if (!range.start || !range.end) {
      setError("Selecciona la fecha inicial y la final.");
      return;
    }

    if (parseDateInput(range.start) > parseDateInput(range.end)) {
      setError("La fecha inicial debe ser anterior a la final.");
      return;
    }

    onApply(range);
    onClose();
  };

  return (
    <form className="modal-form" onSubmit={submit}>
      {error && <p className="form-error">{error}</p>}
      <div className="field-row">
        <label>
          Desde
          <input
            type="date"
            value={range.start}
            onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={range.end}
            onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))}
          />
        </label>
      </div>
      <div className="modal-actions">
        <button className="button button-ghost" onClick={onClose} type="button">
          Cancelar
        </button>
        <button className="button button-primary" type="submit">
          Aplicar fechas
        </button>
      </div>
    </form>
  );
}

function AdminDashboard({ user }) {
  const { employees, questions, setQuestions, evaluations, loading, error, refresh } = useDashboardData({ admin: true });
  const [employeeModal, setEmployeeModal] = useState(null);
  const [questionModal, setQuestionModal] = useState(null);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState(getPreviousMonthRange);
  const filteredEvaluations = useMemo(() => filterEvaluationsByDate(evaluations, dateRange), [evaluations, dateRange]);
  const ranking = useMemo(() => buildRanking(employees, filteredEvaluations), [employees, filteredEvaluations]);
  const totalReviews = filteredEvaluations.length;
  const average = totalReviews
    ? filteredEvaluations.reduce((sum, evaluation) => sum + (typeof evaluation.score === "number" ? evaluation.score : 0), 0) /
      totalReviews
    : 0;
  const dateLabel = `${formatDisplayDate(dateRange.start)} – ${formatDisplayDate(dateRange.end)}`;
  const activeQuestionCount = questions.filter((question) => question.active).length;

  return (
    <div className="admin-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <div className="topbar-title">
            <strong>Arturo 2 Hookah</strong>
            <span>Panel de desempeño</span>
          </div>
          <button className="date-filter" onClick={() => setDateModalOpen(true)} type="button">
            <CalendarDays size={18} />
            <span>{dateLabel}</span>
            <ChevronDown size={16} />
          </button>
          <span className="admin-badge" title={user.email} aria-label="Administrador">
            {getInitials(getUsernameFromEmail(user.email)).slice(0, 2) || "AD"}
          </span>
          <button className="logout-button" onClick={() => signOutAdmin()} type="button">
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        {!hasFirebaseConfig && (
          <div className="notice">
            Modo demo activo. Agrega tus variables en <code>.env</code> para conectar Firebase.
          </div>
        )}
        {error && <div className="notice notice-error">{error}</div>}

        <section className="page-head">
          <div>
            <h1>Ranking del equipo</h1>
            <p>Cómo califican los clientes la atención de cada empleado en el periodo seleccionado.</p>
          </div>
          <div className="stats-strip">
            <Stat
              detail="en el periodo"
              icon={<Users size={20} />}
              label="Evaluaciones"
              value={loading ? "…" : totalReviews.toLocaleString("es-DO")}
            />
            <Stat
              detail="de 5 estrellas"
              icon={<Star size={20} />}
              label="Promedio general"
              value={loading || !totalReviews ? "--" : average.toFixed(1)}
            />
            <Stat
              detail="en la encuesta"
              icon={<MessageCircle size={20} />}
              label="Preguntas activas"
              value={loading ? "…" : activeQuestionCount}
            />
          </div>
        </section>

        <section className="workspace">
          <RankingPanel loading={loading} ranking={ranking} />
          <aside className="side-stack">
            <ManageEmployees
              employees={employees}
              loading={loading}
              onMigrated={refresh}
              onCreate={() => setEmployeeModal({ mode: "create" })}
              onEdit={(employee) => setEmployeeModal({ mode: "edit", employee })}
            />
            <ManageQuestions
              onCreate={() => setQuestionModal({ mode: "create" })}
              onEdit={(question) => setQuestionModal({ mode: "edit", question })}
              questions={questions}
              setQuestions={setQuestions}
            />
          </aside>
        </section>
      </main>

      <button className="mobile-admin-cta" onClick={() => setEmployeeModal({ mode: "create" })} type="button">
        <Plus size={20} /> Nuevo empleado
      </button>

      {employeeModal && (
        <Dialog
          onClose={() => setEmployeeModal(null)}
          title={employeeModal.mode === "edit" ? "Editar empleado" : "Nuevo empleado"}
        >
          <EmployeeForm
            employee={employeeModal.employee}
            onClose={() => setEmployeeModal(null)}
            onSaved={refresh}
            order={employees.length + 1}
          />
        </Dialog>
      )}

      {questionModal && (
        <Dialog
          onClose={() => setQuestionModal(null)}
          title={questionModal.mode === "edit" ? "Editar pregunta" : "Nueva pregunta"}
        >
          <QuestionForm
            onClose={() => setQuestionModal(null)}
            onSaved={refresh}
            order={questions.length + 1}
            question={questionModal.question}
          />
        </Dialog>
      )}

      {dateModalOpen && (
        <Dialog onClose={() => setDateModalOpen(false)} title="Elegir periodo">
          <DateRangeForm
            initialRange={dateRange}
            onApply={setDateRange}
            onClose={() => setDateModalOpen(false)}
          />
        </Dialog>
      )}
    </div>
  );
}

function Podium({ leaders }) {
  // Visual order: 2nd, 1st, 3rd
  const slots = [leaders[1], leaders[0], leaders[2]];
  const places = [2, 1, 3];

  return (
    <div className="podium">
      {slots.map((employee, index) => (
        <div className={`podium-slot place-${places[index]}`} key={employee.id}>
          <div className="podium-avatar">
            <Avatar name={employee.name} size={places[index] === 1 ? 72 : 56} src={employee.avatar} />
            <span className="podium-medal">{places[index]}</span>
          </div>
          <strong>{employee.name}</strong>
          <span className="podium-score">
            {employee.reviews ? employee.score.toFixed(1) : "--"}
            <Star size={14} />
          </span>
          <small>
            {employee.reviews} {employee.reviews === 1 ? "evaluación" : "evaluaciones"}
          </small>
          <div className="podium-step" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

function RankingPanel({ ranking, loading }) {
  const showPodium = !loading && ranking.length >= 3;
  const rest = showPodium ? ranking.slice(3) : ranking;
  const offset = showPodium ? 3 : 0;

  return (
    <section className="panel ranking-panel">
      <header className="panel-head">
        <h2>
          <Trophy size={20} /> Posiciones
        </h2>
        <span className="panel-meta">{ranking.length} empleados</span>
      </header>

      {loading && <div className="empty-state">Cargando ranking…</div>}
      {!loading && ranking.length === 0 && (
        <div className="empty-state">Agrega tu primer empleado para empezar a recibir evaluaciones.</div>
      )}

      {showPodium && <Podium leaders={ranking.slice(0, 3)} />}

      {!loading && rest.length > 0 && (
        <div className="ranking-table" role="table" aria-label="Ranking de empleados">
          <div className="ranking-head" role="row">
            <span role="columnheader">#</span>
            <span role="columnheader">Empleado</span>
            <span role="columnheader">Promedio</span>
            <span role="columnheader">Evaluaciones</span>
          </div>
          {rest.map((employee, index) => (
            <div className="ranking-row" key={employee.id} role="row">
              <span className="rank" role="cell">
                {index + 1 + offset}
              </span>
              <div className="person" role="cell">
                <Avatar name={employee.name} size={40} src={employee.avatar} />
                <div>
                  <strong>{employee.name}</strong>
                  <span>{employee.role}</span>
                </div>
              </div>
              <div className="average" role="cell">
                <strong>{employee.reviews ? employee.score.toFixed(1) : "--"}</strong>
                <ScoreBar value={employee.score} />
              </div>
              <span className="reviews" role="cell">
                {employee.reviews}
                <small> eval.</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CopyLinkButton({ employee }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = getSurveyUrl(employee.id);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(`Copia el enlace de ${employee.name}:`, url);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      aria-label={`Copiar enlace de la encuesta de ${employee.name}`}
      className={copied ? "icon-button copied" : "icon-button"}
      onClick={copy}
      title={copied ? "Enlace copiado" : "Copiar enlace directo a su encuesta"}
      type="button"
    >
      {copied ? <Check size={16} /> : <Link2 size={16} />}
    </button>
  );
}

function LegacyIdNotice({ employees, onMigrated }) {
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState("");

  const migrate = async () => {
    try {
      setMigrating(true);
      setError("");
      for (const employee of employees) {
        await migrateEmployeeToGeneratedId(employee.id);
      }
      await onMigrated();
    } catch (migrationError) {
      console.error(migrationError);
      setError("No se pudieron cambiar todos los enlaces. Vuelve a intentarlo; las evaluaciones no se pierden.");
      await onMigrated().catch(() => {});
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="legacy-notice">
      <p>
        {employees.length === 1 ? "1 empleado tiene" : `${employees.length} empleados tienen`} un enlace con su nombre,
        como <code>/encuesta/{employees[0].id}</code>. Cámbialos a un ID antes de grabar las etiquetas NFC. Sus
        evaluaciones se conservan.
      </p>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-primary button-small" disabled={migrating} onClick={migrate} type="button">
        {migrating ? "Cambiando…" : "Cambiar enlaces a ID"}
      </button>
    </div>
  );
}

function ManageEmployees({ employees, loading, onCreate, onEdit, onMigrated }) {
  const legacyEmployees = loading ? [] : employees.filter(hasLegacyEmployeeId);

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          <User size={20} /> Empleados
        </h2>
        <button className="button button-primary button-small" onClick={onCreate} type="button">
          <Plus size={16} /> Nuevo
        </button>
      </header>
      {legacyEmployees.length > 0 && <LegacyIdNotice employees={legacyEmployees} onMigrated={onMigrated} />}
      <div className="list">
        {employees.length === 0 && <div className="empty-state">Aún no hay empleados. Crea el primero.</div>}
        {employees.map((employee) => (
          <article className="list-row employee-row" key={employee.id}>
            <Avatar name={employee.name} size={38} src={employee.avatar} />
            <div className="list-copy">
              <strong>{employee.name}</strong>
              <span>{employee.role}</span>
            </div>
            <span className={employee.status === "Activo" ? "status" : "status status-off"}>{employee.status}</span>
            <div className="row-actions">
              <CopyLinkButton employee={employee} />
              <button
                aria-label={`Editar ${employee.name}`}
                className="icon-button"
                onClick={() => onEdit(employee)}
                type="button"
              >
                <Pencil size={16} />
              </button>
              <button aria-label={`Eliminar ${employee.name}`} className="icon-button danger" type="button">
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ManageQuestions({ onCreate, onEdit, questions, setQuestions }) {
  const toggleQuestion = async (id) => {
    const currentQuestion = questions.find((question) => question.id === id);

    if (!currentQuestion) {
      return;
    }

    const nextActive = !currentQuestion.active;

    setQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, active: nextActive } : question)),
    );

    try {
      await updateQuestionStatus(id, nextActive);
    } catch (questionError) {
      console.error(questionError);
      setQuestions(questions);
    }
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          <MessageCircle size={20} /> Preguntas de la encuesta
        </h2>
        <button className="button button-primary button-small" onClick={onCreate} type="button">
          <Plus size={16} /> Nueva
        </button>
      </header>
      <div className="list">
        {questions.map((question) => (
          <article className={question.active ? "list-row question-row" : "list-row question-row inactive"} key={question.id}>
            <GripVertical className="grip" size={16} />
            <div className="list-copy">
              <strong>{question.title}</strong>
              <span>{question.description}</span>
            </div>
            <button
              aria-label={`${question.active ? "Ocultar" : "Mostrar"} ${question.title} en la encuesta`}
              aria-pressed={question.active}
              className={question.active ? "switch on" : "switch"}
              onClick={() => toggleQuestion(question.id)}
              type="button"
            >
              <span />
            </button>
            <div className="row-actions">
              <button
                aria-label={`Editar ${question.title}`}
                className="icon-button"
                onClick={() => onEdit(question)}
                type="button"
              >
                <Pencil size={16} />
              </button>
              <button aria-label={`Eliminar ${question.title}`} className="icon-button danger" type="button">
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Una evaluación por dispositivo y por día. Se guarda en el navegador del cliente.
const SURVEY_VOTE_KEY = "arturo-survey-vote";

function getLocalDayKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getTodayVote() {
  try {
    const vote = JSON.parse(window.localStorage.getItem(SURVEY_VOTE_KEY) ?? "null");
    return vote?.day === getLocalDayKey() ? vote : null;
  } catch {
    return null;
  }
}

function saveTodayVote(vote) {
  try {
    window.localStorage.setItem(SURVEY_VOTE_KEY, JSON.stringify({ ...vote, day: getLocalDayKey() }));
  } catch {
    // Sin almacenamiento disponible (modo privado estricto): no se puede recordar el voto.
  }
}

// Enlace directo a un empleado: /encuesta/<id>. Sirve para etiquetas NFC o códigos QR por empleado.
function getSurveyUrl(employeeId) {
  return `${window.location.origin}${appPath(`encuesta/${encodeURIComponent(employeeId)}`)}`;
}

function getEmployeeIdFromPath() {
  const route = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1);
  const match = route.match(/^\/encuesta\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setSurveyPath(employeeId, { replace = false } = {}) {
  const path = employeeId ? appPath(`encuesta/${encodeURIComponent(employeeId)}`) : appPath("encuesta");
  if (window.location.pathname === path) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", path);
}

function PublicSurvey() {
  const { employees, questions, loading, error } = useDashboardData();
  const [selectedEmployee, setSelectedEmployee] = useState(getEmployeeIdFromPath);
  const [todayVote, setTodayVote] = useState(getTodayVote);
  const [closeBlocked, setCloseBlocked] = useState(false);
  const [step, setStep] = useState(() => (todayVote ? 3 : selectedEmployee ? 2 : 1));
  const [linkNotFound, setLinkNotFound] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const activeQuestions = useMemo(() => questions.filter((question) => question.active), [questions]);

  useEffect(() => {
    setAnswers((current) =>
      Object.fromEntries(activeQuestions.map((question) => [question.id, current[question.id] ?? 0])),
    );
  }, [activeQuestions]);

  const employee = employees.find((item) => item.id === selectedEmployee) ?? null;
  const canSubmit = Boolean(employee) && activeQuestions.length > 0 && Object.values(answers).every(Boolean);

  // Si el enlace trae un empleado que no existe (borrado o mal copiado), vuelve a la lista.
  useEffect(() => {
    if (loading || step !== 2 || employee) return;
    setLinkNotFound(Boolean(selectedEmployee));
    setSelectedEmployee(null);
    setSurveyPath(null, { replace: true });
    setStep(1);
  }, [loading, step, employee, selectedEmployee]);

  // Botón "atrás" del navegador: sincroniza el paso con la ruta.
  useEffect(() => {
    const handlePopState = () => {
      if (getTodayVote()) return;
      const employeeId = getEmployeeIdFromPath();
      setSelectedEmployee(employeeId);
      setStep(employeeId ? 2 : 1);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const chooseEmployee = (employeeId) => {
    setLinkNotFound(false);
    setSelectedEmployee(employeeId);
    setSurveyPath(employeeId);
    setStep(2);
  };

  const backToEmployees = () => {
    setSurveyPath(null);
    setStep(1);
  };
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const score = useMemo(() => {
    const values = Object.values(answers).filter(Boolean);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }, [answers]);

  const submitSurvey = async (event) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    if (getTodayVote()) {
      setTodayVote(getTodayVote());
      setStep(3);
      return;
    }

    try {
      setSubmitted(true);
      setSubmitError("");
      await saveEvaluation({ employee, answers, questions: activeQuestions, score });
      const vote = { employeeName: employee.name, score };
      saveTodayVote(vote);
      setTodayVote(vote);
      setStep(3);
    } catch (evaluationError) {
      console.error(evaluationError);
      setSubmitted(false);
      setSubmitError("No se pudo enviar tu evaluación. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  // El navegador solo deja cerrar pestañas abiertas por un script. Si se abrió desde un QR o un enlace,
  // window.close() no hace nada y se le indica al cliente que la cierre él.
  const closeSurvey = () => {
    window.close();
    window.setTimeout(() => setCloseBlocked(true), 300);
  };

  const questionIcons = [Smile, MessageCircle, Clock, ShoppingBag];

  return (
    <div className={`survey-shell step-${step}`}>
      <section className="survey-hero">
        <Logo className="brand brand-tile" />
        <div className="survey-hero-copy">
          <h1>Tu opinión hace mejor cada visita</h1>
          <p>Califica en menos de un minuto cómo te atendieron hoy. Es anónimo.</p>
        </div>
      </section>

      <form className="survey-sheet" onSubmit={submitSurvey}>
        {step === 1 && (
          <section className="survey-step">
            <StepProgress step={1} />
            <header className="step-title">
              <h2>¿Quién te atendió hoy?</h2>
              <p>Toca el nombre de la persona que te ayudó.</p>
            </header>
            {linkNotFound && (
              <p className="form-error">No encontramos al empleado de ese enlace. Elige de la lista quién te atendió.</p>
            )}
            <div className="employee-options">
              {loading && <div className="loading-card">Cargando empleados…</div>}
              {!loading &&
                employees.map((item) => (
                  <button
                    className={selectedEmployee === item.id ? "employee-option selected" : "employee-option"}
                    key={item.id}
                    onClick={() => chooseEmployee(item.id)}
                    type="button"
                  >
                    <Avatar name={item.name} size={48} src={item.avatar} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.role}</small>
                    </span>
                    <ChevronRight size={20} />
                  </button>
                ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="survey-step rating-step">
            <div className="step-nav">
              <button aria-label="Volver" className="back-button" onClick={backToEmployees} type="button">
                <ArrowLeft size={20} />
              </button>
              <StepProgress step={2} />
            </div>

            {employee ? (
              <div className="selected-employee">
                <Avatar name={employee.name} size={48} src={employee.avatar} />
                <div>
                  <span>Te atendió</span>
                  <strong>{employee.name}</strong>
                </div>
                <button className="link-button" onClick={backToEmployees} type="button">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="selected-employee loading-card">Cargando empleado…</div>
            )}

            <header className="step-title">
              <h2>¿Cómo fue su atención?</h2>
              <p>Elige de 1 a 5 estrellas en cada punto.</p>
            </header>

            {(error || submitError) && <p className="form-error">{error || submitError}</p>}

            {loading && <div className="loading-card">Cargando preguntas…</div>}

            <div className="question-list">
              {!loading &&
                activeQuestions.map((question, index) => {
                  const QuestionIcon = questionIcons[index] ?? Star;
                  const answered = Boolean(answers[question.id]);

                  return (
                    <div className={answered ? "question-card answered" : "question-card"} key={question.id}>
                      <span className="question-icon">
                        <QuestionIcon size={20} />
                      </span>
                      <div className="question-copy">
                        <strong>{question.title}</strong>
                        <span>{question.description}</span>
                      </div>
                      <Stars
                        interactive
                        label={question.title}
                        onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                        value={answers[question.id]}
                      />
                    </div>
                  );
                })}
            </div>

            <div className="submit-bar">
              <button className="button button-primary button-large" disabled={!canSubmit || submitted} type="submit">
                {submitted ? "Enviando…" : "Enviar evaluación"}
              </button>
              {!canSubmit && activeQuestions.length > 0 && (
                <small>
                  {answeredCount} de {activeQuestions.length} respondidas
                </small>
              )}
            </div>
          </section>
        )}

        {step === 3 && todayVote && (
          <section className="survey-step thank-you-step">
            <StepProgress step={3} />
            <div className="success-mark">
              <Check size={44} strokeWidth={2.6} />
            </div>
            <h2>¡Gracias por tu opinión!</h2>
            <p>
              Tu evaluación de <strong>{todayVote.employeeName}</strong> ya llegó al equipo.
            </p>
            <div className="thank-you-score">
              <Stars value={todayVote.score} />
              <span>{todayVote.score.toFixed(1)} de 5</span>
            </div>
            <p className="thank-you-note">Puedes volver a evaluar en tu próxima visita.</p>
            {closeBlocked ? (
              <p className="close-hint" role="status">
                Listo. Ya puedes cerrar esta pestaña desde tu navegador.
              </p>
            ) : (
              <button className="button button-secondary button-large close-button" onClick={closeSurvey} type="button">
                <X size={18} /> Cerrar
              </button>
            )}
          </section>
        )}
      </form>
    </div>
  );
}

function getAuthErrorMessage(authError) {
  switch (authError?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Usuario o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Escribe tu usuario y tu contraseña.");
      return;
    }

    try {
      setSigningIn(true);
      setError("");
      await signInAdmin(username, password);
    } catch (authError) {
      console.error(authError);
      setError(getAuthErrorMessage(authError));
      setSigningIn(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="brand brand-tile">
            <img src={LOGO_URL} alt="Arturo Hookah" />
          </span>
          <h1>Panel de desempeño</h1>
          <p>Entra para ver el ranking y administrar el equipo.</p>
        </div>

        {error && <p className="form-error">{error}</p>}

        <label className="login-field">
          Usuario
          <input
            autoCapitalize="none"
            autoComplete="username"
            autoFocus
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </label>
        <label className="login-field">
          Contraseña
          <span className="password-input">
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="icon-button"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        <button className="button button-primary button-large" disabled={signingIn} type="submit">
          <LogIn size={18} /> {signingIn ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function AdminGate() {
  const [user, setUser] = useState(undefined);

  useEffect(() => watchAdminSession(setUser), []);

  if (user === undefined) {
    return <div className="login-shell" aria-busy="true" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AdminDashboard user={user} />;
}

function App() {
  const route = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1);

  if (route.startsWith("/encuesta")) {
    return <PublicSurvey />;
  }

  return <AdminGate />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

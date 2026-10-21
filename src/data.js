export const employees = [
  {
    id: "carlos",
    name: "Carlos",
    role: "Vendedor",
    status: "Activo",
    avatar: "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "valentina",
    name: "Valentina",
    role: "Vendedora",
    status: "Activo",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "andres",
    name: "Andres",
    role: "Vendedor",
    status: "Activo",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "sofia",
    name: "Sofia",
    role: "Vendedora",
    status: "Activo",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "diego",
    name: "Diego",
    role: "Vendedor",
    status: "Activo",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80",
  },
];

export const questions = [
  {
    id: "amabilidad",
    title: "Amabilidad",
    description: "Fue cordial y respetuoso",
    team: "ventas",
    active: true,
  },
  {
    id: "conocimiento",
    title: "Conocimiento",
    description: "Te asesoro bien en los productos",
    team: "ventas",
    active: true,
  },
  {
    id: "rapidez",
    title: "Rapidez",
    description: "Te atendio en un buen tiempo",
    team: "ventas",
    active: true,
  },
  {
    id: "experiencia",
    title: "Experiencia general",
    description: "¿Como calificarias su atencion?",
    team: "ventas",
    active: true,
  },
  {
    id: "delivery-puntualidad",
    title: "Puntualidad",
    description: "Llegó en el tiempo que te dijeron",
    team: "delivery",
    active: true,
  },
  {
    id: "delivery-pedido",
    title: "Pedido completo",
    description: "Llegó todo lo que pediste y en buen estado",
    team: "delivery",
    active: true,
  },
  {
    id: "delivery-trato",
    title: "Trato",
    description: "Fue amable y respetuoso al entregar",
    team: "delivery",
    active: true,
  },
  {
    id: "delivery-presentacion",
    title: "Presentación",
    description: "Llegó bien presentado y con buena actitud",
    team: "delivery",
    active: true,
  },
  {
    id: "delivery-experiencia",
    title: "Experiencia general",
    description: "¿Cómo calificarías la entrega?",
    team: "delivery",
    active: true,
  },
];

// Tipos de puesto. Cada tipo tiene su propio ranking y sus propias preguntas.
// Para agregar otro (ej. Mesero), añade una entrada aquí.
// `roles` son los cargos que se pueden elegir para el empleado (ej. masculino y femenino).
export const teams = [
  { id: "ventas", label: "Vendedor", plural: "Vendedores", roles: ["Vendedor", "Vendedora"] },
  { id: "delivery", label: "Repartidor", plural: "Repartidores", roles: ["Repartidor", "Repartidora"] },
  { id: "seguridad", label: "Seguridad", plural: "Seguridad", roles: ["Seguridad"] },
];

export const DEFAULT_TEAM = "ventas";

// Empleados y preguntas creados antes de existir los tipos no tienen `team`:
// se deduce del puesto escrito, y si no se reconoce, son de ventas.
export function getTeamId(item) {
  if (teams.some((team) => team.id === item?.team)) return item.team;
  const role = item?.role ?? "";
  if (/repart|delivery|motor/i.test(role)) return "delivery";
  if (/segur|vigil/i.test(role)) return "seguridad";
  return DEFAULT_TEAM;
}

export function getTeam(teamId) {
  return teams.find((team) => team.id === teamId) ?? teams[0];
}

// Devuelve el cargo tal como aparece en la lista del tipo; si no coincide, el primero.
export function getRoleOption(teamId, role) {
  const { roles } = getTeam(teamId);
  return roles.find((option) => option.toLowerCase() === (role ?? "").trim().toLowerCase()) ?? roles[0];
}

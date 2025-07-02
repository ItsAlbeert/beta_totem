
import { Icons, type Icon } from "@/components/icons";
import type { UserRole } from "@/context/auth-context";

export interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  description?: string;
  roles?: UserRole[];
}

export interface NavItemGroup {
  title?: string;
  items: (NavItem | NavItemGroup)[];
  roles?: UserRole[];
}

export const primaryNav: NavItemGroup[] = [
  {
    items: [
      {
        title: "General",
        href: "/dashboard",
        icon: Icons.LayoutDashboard,
        description: "Resumen general de la competición.",
        roles: ['admin', 'participant'],
      },
      {
        title: "Registrar Tiempos",
        href: "/times",
        icon: Icons.Clock,
        description: "Introduce tiempos físicos, mentales y estados para los desafíos extra.",
        roles: ['admin'],
      },
      {
        title: "Participantes",
        href: "/participants",
        icon: Icons.Users,
        description: "Ver información de los participantes.",
        roles: ['admin'],
      },
      {
        title: "Juegos",
        href: "/games",
        icon: Icons.Gamepad2,
        description: "Gestionar los juegos de la competición y sus categorías.",
        roles: ['admin'],
      },
      {
        title: "Cálculos",
        href: "/calculations",
        icon: Icons.Calculator,
        description: "Desglose detallado del cálculo de puntuaciones.",
        roles: ['admin'],
      },
    ],
  },
  {
    title: "Estadísticas",
    items: [
      {
        title: "Clasificación",
        href: "/statistics/leaderboard",
        icon: Icons.ListOrdered,
        description: "Ver la clasificación general de los participantes.",
        roles: ['admin', 'participant'],
      },
      {
        title: "Tendencias",
        href: "/statistics/trends",
        icon: Icons.LineChart,
        description: "Analizar tendencias de rendimiento por categoría y juego.",
        roles: ['admin', 'participant'],
      },
      {
        title: "Comparativas",
        href: "/statistics/comparisons",
        icon: Icons.BarChart3,
        description: "Comparar el rendimiento de participantes y juegos.",
        roles: ['admin', 'participant'],
      },
      {
        title: "MVP",
        href: "/statistics/mvp",
        icon: Icons.Award,
        description: "Destacados por juego y categoría.",
        roles: ['admin', 'participant'],
      },
    ],
    roles: ['admin', 'participant'],
  },
];

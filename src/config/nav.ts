
import { Icons, type Icon } from "@/components/icons";

export interface NavItem {
  title: string;
  href: string;
  icon: Icon;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  description?: string;
}

export interface NavItemGroup {
  title?: string;
  items: (NavItem | NavItemGroup)[];
}

export const primaryNav: NavItemGroup[] = [
  {
    items: [
      {
        title: "General",
        href: "/dashboard",
        icon: Icons.LayoutDashboard,
        description: "Resumen general de la competición.",
      },
      {
        title: "Registrar Tiempos",
        href: "/times",
        icon: Icons.Clock,
        description: "Introduce tiempos físicos, mentales y estados para los desafíos extra.",
      },
      {
        title: "Participantes",
        href: "/participants",
        icon: Icons.Users,
        description: "Ver información de los participantes.",
      },
      {
        title: "Juegos",
        href: "/games",
        icon: Icons.Gamepad2,
        description: "Gestionar los juegos de la competición y sus categorías.",
      },
      {
        title: "Cálculos",
        href: "/calculations",
        icon: Icons.Calculator,
        description: "Desglose detallado del cálculo de puntuaciones.",
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
      },
      {
        title: "Tendencias",
        href: "/statistics/trends",
        icon: Icons.LineChart,
        description: "Analizar tendencias de rendimiento por categoría y juego.",
      },
      {
        title: "Comparativas",
        href: "/statistics/comparisons",
        icon: Icons.BarChart3,
        description: "Comparar el rendimiento de participantes y juegos.",
      },
    ],
  },
];

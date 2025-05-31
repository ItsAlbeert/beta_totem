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
        title: "Record Times",
        href: "/times",
        icon: Icons.Clock,
        description: "Input physical, mental, and extra times for participants.",
      },
      {
        title: "Participants",
        href: "/participants",
        icon: Icons.Users,
        description: "View participant information.",
      },
      {
        title: "Games",
        href: "/games",
        icon: Icons.Gamepad2,
        description: "Manage competition games and their categories.",
      },
    ],
  },
  {
    title: "Statistics",
    items: [
      {
        title: "Leaderboard",
        href: "/statistics/leaderboard",
        icon: Icons.ListOrdered,
        description: "View overall participant rankings.",
      },
      {
        title: "Trends",
        href: "/statistics/trends",
        icon: Icons.LineChart,
        description: "Analyze participant performance over time.",
      },
    ],
  },
];

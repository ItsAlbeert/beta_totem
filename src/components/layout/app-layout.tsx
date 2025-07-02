
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { Icons } from "@/components/icons";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";
import { primaryNav as primaryNavItems, type NavItemGroup, type NavItem, type UserRole } from "@/config/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "../ui/toaster";

interface AppLayoutProps {
  children: React.ReactNode;
}

function SidebarBrand() {
  const { open } = useSidebar();
  return (
    <Link href="/" className="flex items-center gap-2">
      <Icons.Logo className={cn("h-7 w-7 text-primary transition-all", !open && "h-8 w-8")} />
      <span
        className={cn(
          "text-xl font-semibold text-foreground transition-opacity duration-200",
          !open && "opacity-0 pointer-events-none"
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}

// Recursive function to filter nav items based on user role
function filterNavItemsByRole(items: (NavItem | NavItemGroup)[], userRole: UserRole): (NavItem | NavItemGroup)[] {
    return items.map(itemOrGroup => {
        // If it's a group, filter its inner items
        if ("items" in itemOrGroup) {
            const filteredGroupItems = filterNavItemsByRole(itemOrGroup.items, userRole);
            // If the group has a role requirement and user doesn't meet it, or if it becomes empty after filtering, don't render it
            if ((itemOrGroup.roles && !itemOrGroup.roles.includes(userRole)) || filteredGroupItems.length === 0) {
                return null;
            }
            return { ...itemOrGroup, items: filteredGroupItems };
        }
        // If it's a single item, check its roles
        if (itemOrGroup.roles && !itemOrGroup.roles.includes(userRole)) {
            return null;
        }
        return itemOrGroup;
    }).filter((item): item is NavItem | NavItemGroup => item !== null);
}

function NavMenu({ items, currentPath }: { items: (NavItem | NavItemGroup)[]; currentPath: string }) {
  return (
    <SidebarMenu>
      {items.map((itemOrGroup, index) =>
        "items" in itemOrGroup ? (
          <React.Fragment key={`group-${index}`}>
            {itemOrGroup.title && (
              <SidebarGroupLabel className="mt-2">{itemOrGroup.title}</SidebarGroupLabel>
            )}
            {itemOrGroup.items.map((item, subIndex) => (
              <SidebarMenuItem key={`${item.title}-${subIndex}`}>
                <SidebarMenuButton
                  asChild
                  isActive={currentPath === item.href}
                  tooltip={item.title}
                  disabled={item.disabled}
                >
                  <Link href={item.href ?? "#"}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </React.Fragment>
        ) : (
          <SidebarMenuItem key={`${itemOrGroup.title}-${index}`}>
            <SidebarMenuButton
              asChild
              isActive={currentPath === itemOrGroup.href}
              tooltip={itemOrGroup.title}
              disabled={itemOrGroup.disabled}
            >
              <Link href={itemOrGroup.href ?? "#"}>
                <itemOrGroup.icon />
                <span>{itemOrGroup.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </SidebarMenu>
  );
}

function UserProfile() {
    const { user, logout } = useAuth();
    if (!user) return null;

    const roleText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    const fallback = user.role.substring(0, 2).toUpperCase();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                     <Avatar className="h-6 w-6">
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    <span>{roleText}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                    Cerrar sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const accessibleNavItems = user ? filterNavItemsByRole(primaryNavItems, user.role) : [];

  return (
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarHeader>
            <SidebarBrand />
          </SidebarHeader>
          <SidebarContent>
            <NavMenu items={accessibleNavItems} currentPath={pathname} />
          </SidebarContent>
          <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-700 bg-gray-950/80 px-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center">
              <SidebarTrigger className="md:hidden" />
            </div>
            <UserProfile />
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <Toaster />
        </SidebarInset>
      </SidebarProvider>
  );
}

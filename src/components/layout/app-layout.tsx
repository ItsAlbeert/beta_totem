
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
import { primaryNav, type NavItemGroup, type NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

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

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider defaultOpen>
        <Sidebar>
          <SidebarHeader>
            <SidebarBrand />
          </SidebarHeader>
          <SidebarContent>
            <NavMenu items={primaryNav} currentPath={pathname} />
          </SidebarContent>
          <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-700 bg-gray-950/80 px-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center">
              <SidebarTrigger className="md:hidden" />
            </div>
            <Button variant="outline" size="sm">Perfil de Usuario</Button>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <Toaster />
        </SidebarInset>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

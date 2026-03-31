import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck
} from "lucide-react";

import { cn } from "@/lib/utils";
import tiverLogo from "@/assets/tiver-logo.png";

interface SuperAdminSidebarProps {
  currentView: string;
  onViewChange: (view: "dashboard" | "workspaces" | "users" | "logs") => void;
}

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Vista general"
  },
  {
    id: "workspaces",
    label: "Workspaces",
    icon: Building2,
    description: "Gestión de empresas"
  },
  {
    id: "users",
    label: "Usuarios",
    icon: Users,
    description: "Gestión de usuarios"
  },
  {
    id: "logs",
    label: "Registros",
    icon: CalendarCheck,
    description: "Ver registros del sistema"
  }
  
];

export const SuperAdminSidebar = ({ currentView, onViewChange }: SuperAdminSidebarProps) => {
  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent className="pr-4">
        {/* Header con logo de Tiver */}
        <div className="flex flex-col items-center py-6 px-4 border-b border-border/20">
          <div className="w-16 h-16 mb-3 rounded-xl overflow-hidden bg-primary shadow-lg">
            <img
              src={tiverLogo}
              alt="Tiver Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-lg font-bold text-primary">TiverDocs</h2>
          <p className="text-xs text-muted-foreground">Panel de Control</p>
        </div>

        <SidebarGroup className="mt-6">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-3">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id as any)}
                    className={cn(
                      "w-full justify-start transition-all duration-200 hover:bg-accent/50 py-4 px-4 rounded-xl mx-2",
                      currentView === item.id && "bg-primary text-primary-foreground font-medium py-6 px-6 shadow-lg hover:bg-primary/90"
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{item.label}</span>
                      <span className={cn(
                        "text-xs",
                        currentView === item.id ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
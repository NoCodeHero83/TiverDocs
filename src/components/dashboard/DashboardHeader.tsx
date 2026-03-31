import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, LogOut, Settings, User, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    rol: "SuperAdmin" | "Administrador" | "Visualizador";
  };
  workspaces: {
    id: string;
    name: string;
  }[];
  onLogout: () => void;
  onWorkspaceChange?: (workspaceId: string) => void;
  selectedWorkspaceId?: string;
}


export const DashboardHeader = ({ user, workspaces, onLogout, onWorkspaceChange, selectedWorkspaceId }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const availableWorkspaces = workspaces;
  const currentWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

  const getRoleColor = (role: string) => {
    if (role === "SuperAdmin" || role === "Administrador") return "bg-primary/10 text-primary";
    return "bg-muted text-muted-foreground";
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SuperAdmin": return "Super Admin";
      case "Administrador": return "Administrador";
      case "Visualizador": return "Visualizador";
      default: return role;
    }
  };


  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">TiverDocs</h1>
              <p className="text-sm text-muted-foreground">{currentWorkspace?.name || 'Sin workspace'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Selector de Workspace */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 shadow-sm">
              <Building2 className="w-5 h-5 text-primary" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-primary/80 font-medium">Workspace Activo</span>
                <Select value={selectedWorkspaceId} onValueChange={onWorkspaceChange}>
                  <SelectTrigger className="w-[220px] bg-transparent border-0 h-auto p-0 text-sm font-semibold text-foreground focus:ring-0 shadow-none hover:text-primary transition-colors [&>span]:bg-transparent [&>span]:text-inherit">
                    <SelectValue
                      placeholder="Seleccionar workspace"
                      className="bg-transparent text-inherit"
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border shadow-xl min-w-[280px] z-50">
                    <div className="p-2 border-b border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">Workspaces Disponibles</span>
                    </div>
                    {availableWorkspaces.map((workspace) => (
                      <SelectItem
                        key={workspace.id}
                        value={workspace.id}
                        className="cursor-pointer focus:bg-primary/10 focus:text-primary py-3 px-3 rounded-md m-1"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${workspace.id === selectedWorkspaceId ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                          <Building2 className="w-4 h-4" />
                          <span className="font-medium">{workspace.name}</span>
                          {workspace.id === selectedWorkspaceId && (
                            <Badge variant="secondary" className="ml-auto text-xs">Activo</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>

                  {/* <SelectContent className="bg-background border border-border shadow-xl min-w-[280px] z-50">
                    <div className="p-2 border-b border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">Workspaces Disponibles</span>
                    </div>
                    {availableWorkspaces.map((workspace) => (
                      <SelectItem
                        key={workspace}
                        value={workspace}
                        className="cursor-pointer focus:bg-primary/10 focus:text-primary py-3 px-3 rounded-md m-1"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${workspace === user.workspace ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                          <Building2 className="w-4 h-4" />
                          <span className="font-medium">{workspace}</span>
                          {workspace === user.workspace && (
                            <Badge variant="secondary" className="ml-auto text-xs">Activo</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent> */}
                </Select>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Badge variant="secondary" className={getRoleColor(user.rol)}>
              {getRoleLabel(user.rol)}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                      {user.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() ?? "?"}

                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/perfil')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
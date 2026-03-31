import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { DocumentsTable } from "@/components/dashboard/DocumentsTable";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { useDocumentStats } from "@/hooks/useDocuments";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export const DashboardPage = () => {
  const { usuario, signOut } = useAuth();
  const { users, loading } = useUsers();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>();
  const { stats: documentStats, isLoading: statsLoading } = useDocumentStats(selectedWorkspaceId);

  console.log("DashboardPage - Usuario:", usuario?.email, "Rol:", usuario?.rol);

  const userWorkspaces = users.find(u => u.id === usuario?.id)?.workspaces.map(w => ({
    id: w.workspace_id,
    name: w.workspace_name
  })) || [];

  useEffect(() => {
    if (userWorkspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(userWorkspaces[0].id);
    }
  }, [userWorkspaces, selectedWorkspaceId]);

  if (!usuario || loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userRole = usuario.rol === 'SuperAdmin' || usuario.rol === 'Administrador' ? 'admin' : 'viewer';
  console.log("DashboardPage - userRole asignado:", userRole);

  return (
    <div className="min-h-screen bg-gradient-background">
      <DashboardHeader
        user={usuario}
        workspaces={userWorkspaces}
        onLogout={signOut}
        onWorkspaceChange={setSelectedWorkspaceId}
        selectedWorkspaceId={selectedWorkspaceId}
      />

      <main className="container mx-auto px-6 py-8 space-y-8">
        {statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : documentStats ? (
          <StatsCards stats={documentStats} />
        ) : null}

        <DocumentsTable workspaceId={selectedWorkspaceId} userRole={userRole} />
      </main>
    </div>
  );
};

// import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
// import { StatsCards } from "@/components/dashboard/StatsCards";
// import { DocumentsTable } from "@/components/dashboard/DocumentsTable";

// interface DashboardPageProps {
//   user: {
//     name: string;
//     email: string;
//     role: "admin" | "viewer";
//     workspace: string;
//     clientId: string;
//   };
//   onLogout: () => void;
// }

// export const DashboardPage = ({ user, onLogout }: DashboardPageProps) => {
//   // Datos simulados de estadísticas
//   const mockStats = {
//     totalDocuments: 1247,
//     activeDocuments: 1139,
//     expiredDocuments: 23,
//     expiringDocuments: 85,
//     totalValue: 15750000000 // 15.75 mil millones COP
//   };

//   return (
//     <div className="min-h-screen bg-gradient-background">
//       <DashboardHeader user={user} onLogout={onLogout} />
      
//       <main className="container mx-auto px-6 py-8 space-y-8">
//         {/* Tarjetas de estadísticas - Solo para administradores */}
//         {user.role === "admin" && <StatsCards stats={mockStats} />}
        
//         {/* Tabla de documentos */}
//         <DocumentsTable userRole={user.role} />
//       </main>
//     </div>
//   );
// };
import { useState } from "react";
import { SuperAdminHeader } from "@/components/superadmin/SuperAdminHeader";
import { SuperAdminSidebar } from "@/components/superadmin/SuperAdminSidebar";
import { SuperAdminDashboard } from "@/components/superadmin/SuperAdminDashboard";
import { WorkspacesManager } from "@/components/superadmin/WorkspacesManager";
import { UsersManager } from "@/components/superadmin/UsersManager";
import { SystemStats } from "@/components/superadmin/SystemStats";
import { SubscriptionsManager } from "@/components/superadmin/SubscriptionsManager";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

type SuperAdminView = "dashboard" | "workspaces" | "users" | "stats" | "subscriptions";

export const SuperAdminPage = () => {
  const { usuario, signOut } = useAuth();

  if (!usuario) return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [currentView, setCurrentView] = useState<SuperAdminView>("dashboard");

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return <SuperAdminDashboard />;
      case "workspaces":
        return <WorkspacesManager />;
      case "users":
        return <UsersManager />;
      case "subscriptions":
        return <SubscriptionsManager />;
      case "stats":
        return <SystemStats />;
      default:
        return <SuperAdminDashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-background">
        <SuperAdminSidebar 
          currentView={currentView} 
          onViewChange={setCurrentView} 
        />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between border-b bg-card px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold text-foreground">
                Panel de Superadministrador
              </h1>
            </div>
            <SuperAdminHeader user={usuario} onLogout={signOut} />
          </header>
          
          <main className="flex-1 p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
// import { useState } from "react";
// import { SuperAdminHeader } from "@/components/superadmin/SuperAdminHeader";
// import { SuperAdminSidebar } from "@/components/superadmin/SuperAdminSidebar";
// import { SuperAdminDashboard } from "@/components/superadmin/SuperAdminDashboard";
// import { WorkspacesManager } from "@/components/superadmin/WorkspacesManager";
// import { UsersManager } from "@/components/superadmin/UsersManager";
// import { StorageStats } from "@/components/superadmin/StorageStats";
// import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// interface SuperAdminPageProps {
//   user: {
//     name: string;
//     email: string;
//     role: "superadmin";
//     workspace: string;
//     clientId: string;
//   };
//   onLogout: () => void;
// }

// type SuperAdminView = "dashboard" | "workspaces" | "users" | "stats";

// export const SuperAdminPage = ({ user, onLogout }: SuperAdminPageProps) => {
//   const [currentView, setCurrentView] = useState<SuperAdminView>("dashboard");

//   const renderContent = () => {
//     switch (currentView) {
//       case "dashboard":
//         return <SuperAdminDashboard />;
//       case "workspaces":
//         return <WorkspacesManager />;
//       case "users":
//         return <UsersManager />;
//       case "stats":
//         return <StorageStats />;
//       default:
//         return <SuperAdminDashboard />;
//     }
//   };

//   return (
//     <SidebarProvider>
//       <div className="min-h-screen flex w-full bg-gradient-background">
//         <SuperAdminSidebar 
//           currentView={currentView} 
//           onViewChange={setCurrentView} 
//         />
        
//         <div className="flex-1 flex flex-col">
//           <header className="h-16 flex items-center justify-between border-b bg-card px-6">
//             <div className="flex items-center gap-4">
//               <SidebarTrigger />
//               <h1 className="text-xl font-semibold text-foreground">
//                 Panel de Superadministrador
//               </h1>
//             </div>
//             <SuperAdminHeader user={user} onLogout={onLogout} />
//           </header>
          
//           <main className="flex-1 p-6">
//             {renderContent()}
//           </main>
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// };
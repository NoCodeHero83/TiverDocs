import { useAuth } from "@/contexts/AuthContext"; 
import { LoginPage } from "./LoginPage";
import { DashboardPage } from "./DashboardPage";
import { SuperAdminPage } from "./SuperAdminPage";

const Index = () => {
  const { usuario, loading } = useAuth();

  console.log(`[Index] Render - Loading: ${loading}, Usuario: ${usuario?.email || 'null'}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Sincronizando sesión segura...</p>
        </div>
      </div>
    );
  }

  if (usuario) {
    console.log("Redirigiendo basado en rol:", usuario.rol);

    if (usuario.rol === "SuperAdmin") {
      console.log("Mostrando SuperAdminPage");
      return <SuperAdminPage />;
    }

    console.log("Mostrando DashboardPage para rol:", usuario.rol);
    return <DashboardPage />;
  }

  console.log("No hay usuario, mostrando LoginPage");
  return <LoginPage />;
};

export default Index;

// import { useState } from "react";
// import { LoginPage } from "./LoginPage";
// import { DashboardPage } from "./DashboardPage";
// import { SuperAdminPage } from "./SuperAdminPage";

// const Index = () => {
//   const [user, setUser] = useState<any>(null);

//   const handleLogin = (userData: any) => {
//     setUser(userData);
//   };

//   const handleLogout = () => {
//     setUser(null);
//   };

//   if (user) {
//     if (user.role === "superadmin") {
//       return (
//         <SuperAdminPage 
//           user={user} 
//           onLogout={handleLogout}
//         />
//       );
//     }
    
//     return (
//       <DashboardPage 
//         user={user} 
//         onLogout={handleLogout}
//       />
//     );
//   }

//   return <LoginPage onLogin={handleLogin} />;
// };

// export default Index;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Building2
} from "lucide-react";
import { useSystemStats } from "@/hooks/useSystemStats";


export const SystemStats = () => {
  const { workspaceStats, businessMetrics, loading } = useSystemStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CO').format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gradient-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Estadísticas por workspace */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Rendimiento por Workspace
          </CardTitle>
          <CardDescription>
            Métricas de documentos, usuarios y crecimiento por empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workspaceStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles
              </div>
            ) : (
              workspaceStats.map((workspace, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{workspace.workspace}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>{formatNumber(workspace.documents)} docs</span>
                    <span>{workspace.users} usuarios</span>
                    <span>{formatCurrency(workspace.value)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {workspace.growth >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">+{workspace.growth}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span className="text-destructive font-medium">{workspace.growth}%</span>
                    </>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de negocio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+{businessMetrics.monthlyGrowth}%</div>
            <p className="text-xs text-muted-foreground">
              Comparado con el mes anterior
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Workspaces</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessMetrics.newWorkspaces}</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos Usuarios</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessMetrics.newUsers}</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volumen Procesado</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(businessMetrics.processingVolume)}</div>
            <p className="text-xs text-muted-foreground">
              Total en documentos
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
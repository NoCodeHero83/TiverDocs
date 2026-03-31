import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  HardDrive, 
  Database, 
  Building2,
  TrendingUp,
  Folder,
  Archive
} from "lucide-react";

const storageData = {
  totalStorageUsed: 2.4, // TB
  totalStorageCapacity: 10, // TB
  workspaceStorage: [
    {
      workspace: "Empresa A - Financiera",
      storageUsed: 850, // GB
      documents: 18900,
      percentage: 35.4
    },
    {
      workspace: "Banco Regional S.A.",
      storageUsed: 620, // GB
      documents: 12450,
      percentage: 25.8
    },
    {
      workspace: "Empresa B - Cooperativa",
      storageUsed: 420, // GB
      documents: 8750,
      percentage: 17.5
    },
    {
      workspace: "Financiera Capital",
      storageUsed: 310, // GB
      documents: 3200,
      percentage: 12.9
    },
    {
      workspace: "Otros workspaces",
      storageUsed: 200, // GB
      documents: 2590,
      percentage: 8.4
    }
  ]
};

export const StorageStats = () => {
  const formatStorageSize = (sizeInGB: number) => {
    if (sizeInGB >= 1024) {
      return `${(sizeInGB / 1024).toFixed(1)} TB`;
    }
    return `${sizeInGB} GB`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CO').format(value);
  };

  const storagePercentage = (storageData.totalStorageUsed / storageData.totalStorageCapacity) * 100;

  return (
    <div className="space-y-6">
      {/* Resumen general de almacenamiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espacio Total Usado</CardTitle>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStorageSize(storageData.totalStorageUsed * 1024)}</div>
            <div className="space-y-2 mt-2">
              <Progress value={storagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {formatStorageSize(storageData.totalStorageCapacity * 1024)} disponibles 
                ({storagePercentage.toFixed(1)}% usado)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos por Workspace</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(storageData.workspaceStorage.reduce((acc, ws) => acc + ws.documents, 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Distribuidos en {storageData.workspaceStorage.length} workspaces
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle por workspace */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Espacio Usado por Workspace
          </CardTitle>
          <CardDescription>
            Distribución del almacenamiento utilizado por cada empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {storageData.workspaceStorage.map((workspace, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Folder className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{workspace.workspace}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Archive className="w-3 h-3" />
                        {formatNumber(workspace.documents)} docs
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatStorageSize(workspace.storageUsed)}
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Uso del espacio</span>
                        <span className="font-medium">{workspace.percentage}%</span>
                      </div>
                      <Progress value={workspace.percentage} className="h-1.5" />
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 ml-4">
                  <Badge variant="outline" className="font-mono">
                    {formatStorageSize(workspace.storageUsed)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm font-medium">Crecimiento mensual estimado</span>
              </div>
              <Badge variant="outline" className="text-success border-success">
                +120 GB/mes
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Basado en el promedio de crecimiento de los últimos 3 meses
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
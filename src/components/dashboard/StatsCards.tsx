import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Clock
} from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalDocuments: number;
    activeDocuments: number;
    expiredDocuments: number;
    expiringDocuments: number;
    totalValue: number;
  };
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      notation: "compact",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const cards = [
    {
      title: "Total Documentos",
      value: stats.totalDocuments.toLocaleString(),
      description: "Pagarés en el sistema",
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Valor Total",
      value: formatCurrency(stats.totalValue),
      description: "Valor agregado de títulos",
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Documentos Vigentes",
      value: stats.activeDocuments.toLocaleString(),
      description: "En estado activo",
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Por Vencer",
      value: stats.expiringDocuments.toLocaleString(),
      description: "Próximos 30 días",
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "Vencidos",
      value: stats.expiredDocuments.toLocaleString(),
      description: "Requieren atención",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="shadow-card border-0 bg-gradient-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
              {card.title === "Por Vencer" && stats.expiringDocuments > 0 && (
                <Badge variant="outline" className="mt-2 text-xs bg-warning/10 text-warning border-warning/20">
                  Revisar pronto
                </Badge>
              )}
              {card.title === "Vencidos" && stats.expiredDocuments > 0 && (
                <Badge variant="outline" className="mt-2 text-xs bg-destructive/10 text-destructive border-destructive/20">
                  Acción requerida
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
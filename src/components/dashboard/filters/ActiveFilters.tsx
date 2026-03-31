import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { FilterValue } from "./types";

interface ActiveFiltersProps {
  filters: FilterValue[];
  onRemoveFilter: (index: number) => void;
  onClearAll: () => void;
}

export const ActiveFilters = ({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) => {
  if (filters.length === 0) return null;

  const formatFilterValue = (filter: FilterValue) => {
    const operatorLabels: Record<string, string> = {
      contains: "contiene",
      equals: "=",
      startsWith: "comienza con",
      endsWith: "termina con",
      greaterThan: ">",
      lessThan: "<",
      between: "entre",
      before: "antes de",
      after: "después de"
    };

    const operator = operatorLabels[filter.operator] || filter.operator;
    return `${filter.label} ${operator} "${filter.value}"`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg">
      <span className="text-sm font-medium text-muted-foreground">
        Filtros activos:
      </span>
      
      {filters.map((filter, index) => (
        <Badge
          key={`${filter.field}-${index}`}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          <span className="text-xs">
            {formatFilterValue(filter)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveFilter(index)}
            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        </Badge>
      ))}

      {filters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Limpiar todo
        </Button>
      )}
    </div>
  );
};
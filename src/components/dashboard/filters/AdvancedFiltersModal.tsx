import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, DollarSign, FileText, User, Building, Settings, X, Tag } from "lucide-react";
import { FilterConfig, FilterValue } from "./types";
import { getFilterCategoriesByDocumentType } from "./dynamicFilterConfigs";

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterValue[]) => void;
  availableFilters: FilterConfig[];
  currentFilters: FilterValue[];
  selectedDocumentType?: string;
  customAttributes?: any[];
  workspaceId?: string;
}

export const AdvancedFiltersModal = ({
  isOpen,
  onClose,
  onApplyFilters,
  availableFilters,
  currentFilters,
  selectedDocumentType,
  customAttributes = [],
  workspaceId
}: AdvancedFiltersModalProps) => {
  const [selectedFilters, setSelectedFilters] = useState<FilterValue[]>(currentFilters);

  // Update available filters when document type changes
  const filterCategories = getFilterCategoriesByDocumentType(selectedDocumentType || "", availableFilters, customAttributes);

  // Reset selected filters when document type changes
  React.useEffect(() => {
    // Only keep filters that are still available in the new document type
    const validFilters = selectedFilters.filter(filter => 
      availableFilters.some(af => af.field === filter.field)
    );
    if (validFilters.length !== selectedFilters.length) {
      setSelectedFilters(validFilters);
    }
  }, [selectedDocumentType, availableFilters]);

  const addFilter = (filterConfig: FilterConfig) => {
    const existingFilter = selectedFilters.find(f => f.field === filterConfig.field);
    if (existingFilter) return;

    const newFilter: FilterValue = {
      field: filterConfig.field,
      operator: filterConfig.type === "text" ? "contains" : "equals",
      value: "",
      label: filterConfig.label
    };

    setSelectedFilters([...selectedFilters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<FilterValue>) => {
    const updated = [...selectedFilters];
    updated[index] = { ...updated[index], ...updates };
    setSelectedFilters(updated);
  };

  const removeFilter = (index: number) => {
    setSelectedFilters(selectedFilters.filter((_, i) => i !== index));
  };

  const renderFilterInput = (filter: FilterValue, index: number) => {
    let config = availableFilters.find(f => f.field === filter.field);
    
    // Check if it's a custom attribute
    if (!config && filter.field.startsWith('custom_')) {
      const attributeName = filter.field.replace('custom_', '');
      const customAttr = customAttributes.find(attr => attr.name === attributeName);
      if (customAttr) {
        config = {
          field: filter.field,
          label: customAttr.label,
          type: customAttr.type,
          options: customAttr.options
        };
      }
    }
    
    if (!config) return null;

    switch (config.type) {
      case "text":
        return (
          <Input
            placeholder="Ingresa el texto a buscar..."
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value, operator: "contains" })}
          />
        );

      case "number":
        if (filter.operator === "between") {
          // Parse existing range value or set defaults
          const currentRange = typeof filter.value === 'string' && filter.value.includes('|') 
            ? filter.value.split('|') 
            : ['', ''];
          const [minValue, maxValue] = currentRange;

          return (
            <div className="space-y-2">
              <Select value={filter.operator} onValueChange={(value) => updateFilter(index, { operator: value, value: value === "between" ? "|" : "" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="greaterThan">Mayor que</SelectItem>
                  <SelectItem value="lessThan">Menor que</SelectItem>
                  <SelectItem value="between">Entre</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-12">Mínimo:</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minValue}
                    onChange={(e) => {
                      const newValue = `${e.target.value}|${maxValue}`;
                      updateFilter(index, { value: newValue });
                    }}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground w-12">Máximo:</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={maxValue}
                    onChange={(e) => {
                      const newValue = `${minValue}|${e.target.value}`;
                      updateFilter(index, { value: newValue });
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-2">
              <Select value={filter.operator} onValueChange={(value) => updateFilter(index, { operator: value, value: value === "between" ? "|" : "" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="greaterThan">Mayor que</SelectItem>
                  <SelectItem value="lessThan">Menor que</SelectItem>
                  <SelectItem value="between">Entre</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Valor..."
                value={filter.value.toString()}
                onChange={(e) => updateFilter(index, { value: e.target.value })}
              />
            </div>
          );
        }

      case "date":
        // Parse existing range value or set defaults
        const currentRange = typeof filter.value === 'string' && filter.value.includes('|') 
          ? filter.value.split('|') 
          : ['', ''];
        const [fromDate, toDate] = currentRange;

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-12">Desde:</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  const newValue = `${e.target.value}|${toDate}`;
                  updateFilter(index, { value: newValue, operator: "between" });
                }}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-12">Hasta:</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  const newValue = `${fromDate}|${e.target.value}`;
                  updateFilter(index, { value: newValue, operator: "between" });
                }}
                className="flex-1"
              />
            </div>
          </div>
        );

      case "select":
        return (
          <Select value={filter.value.toString()} onValueChange={(value) => updateFilter(index, { value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  const handleApply = () => {
    const validFilters = selectedFilters.filter(f => f.value && f.value.toString().trim() !== "");
    onApplyFilters(validFilters);
    onClose();
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Filtros Avanzados
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Filters */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Label className="text-sm font-medium">Campos disponibles para filtrar</Label>
            </div>
            
            <Tabs defaultValue="fijos" className="w-full">
              <TabsList className={`grid w-full ${customAttributes && customAttributes.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="fijos">Campos Fijos</TabsTrigger>
                <TabsTrigger value="variables">Campos Variables</TabsTrigger>
                {(() => {
                  const visibleCustom = workspaceId
                    ? customAttributes.filter(a => a.workspaceId === workspaceId)
                    : customAttributes.filter(a => !a.workspaceId);
                  return visibleCustom && visibleCustom.length > 0 ? (
                    <TabsTrigger value="personalizados">Campos Personalizados</TabsTrigger>
                  ) : null;
                })()}
              </TabsList>
              
              <TabsContent value="fijos" className="mt-4">
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground">Campos disponibles en todos los tipos de documento</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filterCategories.fijos.map((filter) => (
                    <Button
                      key={filter.field}
                      variant="outline"
                      size="sm"
                      onClick={() => addFilter(filter)}
                      disabled={selectedFilters.some(f => f.field === filter.field)}
                      className="justify-start h-auto p-2 text-xs"
                    >
                      <Building className="w-3 h-3 mr-1" />
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="variables" className="mt-4">
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedDocumentType 
                      ? `Campos específicos para ${selectedDocumentType}` 
                      : "Selecciona un tipo de documento en los filtros principales"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filterCategories.variables.length > 0 ? (
                    filterCategories.variables.map((filter) => (
                      <Button
                        key={filter.field}
                        variant="outline"
                        size="sm"
                        onClick={() => addFilter(filter)}
                        disabled={selectedFilters.some(f => f.field === filter.field)}
                        className="justify-start h-auto p-2 text-xs"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        {filter.label}
                      </Button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-muted-foreground text-xs py-4">
                      {selectedDocumentType 
                        ? "No hay campos específicos disponibles"
                        : "Selecciona un tipo de documento para ver campos específicos"}
                    </div>
                  )}
                </div>
              </TabsContent>

              {(() => {
                const visibleCustom = workspaceId
                  ? customAttributes.filter(a => a.workspaceId === workspaceId)
                  : customAttributes.filter(a => !a.workspaceId);
                return visibleCustom && visibleCustom.length > 0 ? (
                  <TabsContent value="personalizados" className="mt-4">
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedDocumentType 
                        ? `Campos personalizados para ${selectedDocumentType}` 
                        : "Selecciona un tipo de documento para ver campos personalizados"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleCustom
                      .filter(attr => !selectedDocumentType || attr.documentTypes.includes(selectedDocumentType))
                      .length > 0 ? (
                      visibleCustom
                        .filter(attr => !selectedDocumentType || attr.documentTypes.includes(selectedDocumentType))
                        .map((attr) => (
                          <Button
                            key={attr.id}
                            variant="outline"
                            size="sm"
                            onClick={() => addFilter({
                              field: `custom_${attr.name}`,
                              label: attr.label,
                              type: attr.type,
                              options: attr.options
                            })}
                            disabled={selectedFilters.some(f => f.field === `custom_${attr.name}`)}
                            className="justify-start h-auto p-2 text-xs"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {attr.label}
                          </Button>
                        ))
                    ) : (
                      <div className="col-span-2 text-center text-muted-foreground text-xs py-4">
                        {selectedDocumentType 
                          ? "No hay campos personalizados para este tipo de documento"
                          : "Selecciona un tipo de documento para ver campos personalizados"}
                      </div>
                    )}
                  </div>
                </TabsContent>
                ) : null;
              })()}
            </Tabs>
          </div>

          {/* Selected Filters */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium">
                Filtros activos ({selectedFilters.length})
              </Label>
              {selectedFilters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Limpiar todo
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {selectedFilters.map((filter, index) => (
                  <div key={`${filter.field}-${index}`} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {filter.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {renderFilterInput(filter, index)}
                  </div>
                ))}

                {selectedFilters.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Selecciona campos de la izquierda para agregar filtros
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={selectedFilters.length === 0}>
            Aplicar Filtros ({selectedFilters.filter(f => f.value && f.value.toString().trim() !== "").length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
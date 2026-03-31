import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Settings, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomAttributes, CustomAttribute } from "@/hooks/useCustomAttributes";

interface DocumentAttribute {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  documentTypes: string[];
  options?: string[];
  required: boolean;
}

interface AttributeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (attributes: CustomAttribute[]) => void;
  workspaceId?: string;
}

export const AttributeManager = ({ isOpen, onClose, onSave, workspaceId }: AttributeManagerProps) => {
  const { toast } = useToast();
  const { attributes, createAttribute, updateAttribute, deleteAttribute } = useCustomAttributes(workspaceId);
  const [newAttribute, setNewAttribute] = useState<Partial<CustomAttribute>>({
    name: "",
    label: "",
    type: "text",
    documentTypes: [],
    options: [],
    required: false
  });

  const [isCreating, setIsCreating] = useState(false);
  const [optionInput, setOptionInput] = useState("");

  const documentTypeOptions = ["Pagaré", "Solicitud de crédito", "Consentimiento informado"];

  const handleSave = () => {
    const visible = workspaceId ? attributes.filter(a => a.workspaceId === workspaceId) : attributes.filter(a => !a.workspaceId);
    onSave(visible);
    toast({
      title: "Atributos guardados",
      description: "Los campos personalizados han sido guardados correctamente.",
    });
    onClose();
  };

  const addNewAttribute = () => {
    if (!newAttribute.name || !newAttribute.label) {
      toast({
        title: "Error",
        description: "Completa todos los campos requeridos.",
        variant: "destructive"
      });
      return;
    }

    (async () => {
      try {
        await createAttribute({
          name: newAttribute.name || "",
          label: newAttribute.label || "",
          type: newAttribute.type || "text",
          documentTypes: newAttribute.documentTypes || [],
          options: newAttribute.options || [],
          required: newAttribute.required || false
        }, workspaceId);

        toast({
          title: "Atributo agregado",
          description: `Campo "${newAttribute.label}" agregado correctamente.`,
        });

        setNewAttribute({
          name: "",
          label: "",
          type: "text",
          documentTypes: [],
          options: [],
          required: false
        });
        setIsCreating(false);
        setOptionInput("");
      } catch (e) {
        toast({ title: 'Error', description: 'No se pudo crear el atributo', variant: 'destructive' });
      }
    })();
  };

  const removeAttribute = (id: string) => {
    (async () => {
      try {
        await deleteAttribute(id);
        toast({ title: "Atributo eliminado", description: "El campo personalizado ha sido eliminado." });
      } catch (e) {
        toast({ title: 'Error', description: 'No se pudo eliminar el atributo', variant: 'destructive' });
      }
    })();
  };

  const addOption = () => {
    if (optionInput.trim() && newAttribute.options) {
      setNewAttribute({
        ...newAttribute,
        options: [...newAttribute.options, optionInput.trim()]
      });
      setOptionInput("");
    }
  };

  const removeOption = (option: string) => {
    if (newAttribute.options) {
      setNewAttribute({
        ...newAttribute,
        options: newAttribute.options.filter(opt => opt !== option)
      });
    }
  };

  const toggleDocumentType = (docType: string) => {
    const currentTypes = newAttribute.documentTypes || [];
    if (currentTypes.includes(docType)) {
      setNewAttribute({
        ...newAttribute,
        documentTypes: currentTypes.filter(type => type !== docType)
      });
    } else {
      setNewAttribute({
        ...newAttribute,
        documentTypes: [...currentTypes, docType]
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gestionar Atributos de Documentos
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
          {/* Existing Attributes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Atributos Existentes ({attributes.length})</h3>
              <Button
                onClick={() => setIsCreating(true)}
                size="sm"
                className="bg-gradient-primary hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>

            <div className="space-y-3">
              {(
                workspaceId
                  ? attributes.filter(a => a.workspaceId === workspaceId)
                  : attributes.filter(a => !a.workspaceId)
              ).map((attr) => (
                <Card key={attr.id} className="shadow-card border-0 bg-gradient-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-medium">{attr.label}</CardTitle>
                          {attr.workspaceId ? (
                            <Badge variant="secondary" className="text-xs">Workspace</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Global</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Campo: {attr.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttribute(attr.id)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {attr.type}
                        </Badge>
                        {attr.required && (
                          <Badge variant="destructive" className="text-xs">
                            Requerido
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {attr.documentTypes.map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                      {attr.options && attr.options.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Opciones: {attr.options.join(", ")}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(
                workspaceId
                  ? attributes.filter(a => a.workspaceId === workspaceId).length === 0
                  : attributes.filter(a => !a.workspaceId).length === 0
              ) && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No hay atributos configurados. Agrega el primero.
                </div>
              )}
            </div>
          </div>

          {/* New Attribute Form */}
          {isCreating && (
            <Card className="shadow-card border-0 bg-gradient-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="w-4 h-4" />
                  Nuevo Atributo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Nombre del campo</Label>
                    <Input
                      placeholder="ej: sucursal"
                      value={newAttribute.name}
                      onChange={(e) => setNewAttribute({...newAttribute, name: e.target.value})}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Etiqueta visible</Label>
                    <Input
                      placeholder="ej: Sucursal de origen"
                      value={newAttribute.label}
                      onChange={(e) => setNewAttribute({...newAttribute, label: e.target.value})}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tipo de campo</Label>
                  <Select
                    value={newAttribute.type}
                    onValueChange={(value: any) => setNewAttribute({...newAttribute, type: value})}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="date">Fecha</SelectItem>
                      <SelectItem value="select">Lista de opciones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tipos de documento</Label>
                  <div className="flex flex-wrap gap-2">
                    {documentTypeOptions.map(docType => (
                      <Badge
                        key={docType}
                        variant={newAttribute.documentTypes?.includes(docType) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleDocumentType(docType)}
                      >
                        {docType}
                      </Badge>
                    ))}
                  </div>
                </div>

                {newAttribute.type === "select" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Opciones</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Agregar opción..."
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addOption()}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={addOption}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {newAttribute.options?.map(option => (
                        <Badge
                          key={option}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() => removeOption(option)}
                        >
                          {option} <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsCreating(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={addNewAttribute}
                    size="sm"
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                  >
                    Agregar Atributo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

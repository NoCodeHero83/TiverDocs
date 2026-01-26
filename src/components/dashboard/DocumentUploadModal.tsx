import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, X, Plus, Building, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomAttributes, DocumentAttributeValue } from "@/hooks/useCustomAttributes";
import { getFilterConfigsByDocumentType } from "./filters/dynamicFilterConfigs";
import { DocumentData } from "@/services/documentService";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, documentData: Partial<DocumentData>, customAttributes: Array<{ atributo_id: string; valor: string }>) => void;
  isUploading?: boolean;
  workspaceId?: string;
}

export const DocumentUploadModal = ({ isOpen, onClose, onUpload, isUploading = false, workspaceId }: DocumentUploadModalProps) => {
  const { toast } = useToast();
  const { getAttributesForDocumentType } = useCustomAttributes(workspaceId);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [basicAttributeValues, setBasicAttributeValues] = useState<Record<string, string | number>>({});
  const [customAttributeValues, setCustomAttributeValues] = useState<Record<string, string | number>>({});

  const documentTypes = ["Pagaré", "Solicitud de crédito", "Consentimiento informado"];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDocumentTypeChange = (type: string) => {
    setDocumentType(type);
    setBasicAttributeValues({}); // Reset basic attribute values when document type changes
    setCustomAttributeValues({}); // Reset custom attribute values when document type changes
  };

  const handleBasicAttributeChange = (fieldName: string, value: string | number) => {
    setBasicAttributeValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCustomAttributeChange = (attributeId: string, value: string | number) => {
    console.log("Atributo ", attributeId)
    setCustomAttributeValues(prev => ({
      ...prev,
      [attributeId]: value
    }));
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Selecciona un archivo para subir.",
        variant: "destructive"
      });
      return;
    }

    if (!documentType) {
      toast({
        title: "Error",
        description: "Selecciona el tipo de documento.",
        variant: "destructive"
      });
      return;
    }

    const documentData: Partial<DocumentData> = {
      tipo_documento: documentType,
      estado: 'Activo',
      ...Object.fromEntries(
        Object.entries(basicAttributeValues).map(([field, value]) => {
          const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          return [snakeField, value];
        })
      )
    };

    const customAttrs = Object.entries(customAttributeValues).map(([attributeId, value]) => ({
      atributo_id: attributeId,
      valor: String(value)
    }));

    onUpload(selectedFile, documentData, customAttrs);

    setSelectedFile(null);
    setDocumentType("");
    setBasicAttributeValues({});
    setCustomAttributeValues({});
  };

  // Get available filters for the selected document type
  const availableBasicFields = documentType ? getFilterConfigsByDocumentType(documentType) : [];
  const customAttributes = documentType ? getAttributesForDocumentType(documentType) : [];

  // Separate basic fields (excluding common fields that are auto-generated)
  const basicFields = availableBasicFields.filter(field =>
    !['empresa', 'proceso', 'subproceso', 'fechaIngreso', 'id'].includes(field.field)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Subir Documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* File Upload */}
          <Card className="border-dashed border-2 border-primary/30 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="ml-auto h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
                      <p className="text-xs text-muted-foreground">o haz clic para seleccionar</p>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx"
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Documento</Label>
            <Select value={documentType} onValueChange={handleDocumentTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Attributes */}
          {(basicFields.length > 0 || customAttributes.length > 0) && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Campos Básicos</TabsTrigger>
                <TabsTrigger value="custom">Campos Personalizados</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-4">
                {basicFields.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Información Básica del Documento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {basicFields.map((field) => (
                        <div key={field.field} className="space-y-2">
                          <Label className="text-sm font-medium">
                            {field.label}
                          </Label>

                          {field.type === "text" && (
                            <Input
                              placeholder={`Ingresa ${field.label.toLowerCase()}`}
                              value={basicAttributeValues[field.field] || ""}
                              onChange={(e) => handleBasicAttributeChange(field.field, e.target.value)}
                            />
                          )}

                          {field.type === "number" && (
                            <Input
                              type="number"
                              placeholder={`Ingresa ${field.label.toLowerCase()}`}
                              value={basicAttributeValues[field.field] || ""}
                              onChange={(e) => handleBasicAttributeChange(field.field, parseFloat(e.target.value) || 0)}
                            />
                          )}

                          {field.type === "date" && (
                            <Input
                              type="date"
                              value={basicAttributeValues[field.field] || ""}
                              onChange={(e) => handleBasicAttributeChange(field.field, e.target.value)}
                            />
                          )}

                          {field.type === "select" && field.options && (
                            <Select
                              value={basicAttributeValues[field.field]?.toString() || ""}
                              onValueChange={(value) => handleBasicAttributeChange(field.field, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Selecciona ${field.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map(option => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No hay campos básicos específicos para este tipo de documento.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom" className="mt-4">
                {customAttributes.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Atributos Personalizados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {customAttributes.map((attribute) => (
                        <div key={attribute.id} className="space-y-2">
                          <Label className="text-sm font-medium">
                            {attribute.label}
                            {attribute.required && <span className="text-destructive ml-1">*</span>}
                          </Label>

                          {attribute.type === "text" && (
                            <Input
                              placeholder={`Ingresa ${attribute.label.toLowerCase()}`}
                              value={customAttributeValues[attribute.id] || ""}
                              onChange={(e) => handleCustomAttributeChange(attribute.id, e.target.value)}
                            />
                          )}

                          {attribute.type === "number" && (
                            <Input
                              type="number"
                              placeholder={`Ingresa ${attribute.label.toLowerCase()}`}
                              value={customAttributeValues[attribute.id] || ""}
                              onChange={(e) => handleCustomAttributeChange(attribute.id, parseFloat(e.target.value) || 0)}
                            />
                          )}

                          {attribute.type === "date" && (
                            <Input
                              type="date"
                              value={customAttributeValues[attribute.id] || ""}
                              onChange={(e) => handleCustomAttributeChange(attribute.id, e.target.value)}
                            />
                          )}

                          {attribute.type === "select" && attribute.options && (
                            <Select
                              value={customAttributeValues[attribute.id]?.toString() || ""}
                              onValueChange={(value) => handleCustomAttributeChange(attribute.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Selecciona ${attribute.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {attribute.options.map(option => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No hay atributos personalizados configurados para este tipo de documento.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {documentType && basicFields.length === 0 && customAttributes.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No hay atributos configurados para este tipo de documento.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !documentType || isUploading}
            className="bg-gradient-primary hover:opacity-90"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              'Subir Documento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
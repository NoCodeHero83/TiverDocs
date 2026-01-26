import { useState } from "react";
import PdfViewerNoDownload from "@/components/PdfViewerNoDownload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Settings,
  Upload,
  Eye,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AdvancedFiltersModal } from "./filters/AdvancedFiltersModal";
import { ActiveFilters } from "./filters/ActiveFilters";
import { getFilterConfigsByDocumentType } from "./filters/dynamicFilterConfigs";
import { FilterValue } from "./filters/types";
import { DocumentUploadModal } from "./DocumentUploadModal";
import { useCustomAttributes } from "@/hooks/useCustomAttributes";
import { AttributeManager } from "@/components/admin/AttributeManager";
import { CustomAttribute } from "@/hooks/useCustomAttributes";
import { useDocuments, DocumentWithAttributes } from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentData } from "@/services/documentService";
import { logActivity } from '@/services/activityService';

interface DocumentsTableProps {
  userRole?: "admin" | "viewer";
  workspaceId?: string;
}

export const DocumentsTable = ({ userRole = "admin", workspaceId }: DocumentsTableProps) => {
  const { usuario } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const {
    documents: pagedDocuments,
    isLoading,
    uploadDocument,
    isUploading,
    downloadDocument,
    deleteDocument,
    isDeleting,
    total
  } = useDocuments(workspaceId, page, pageSize);

  const [searchTerm, setSearchTerm] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState<FilterValue[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAttributeManagerOpen, setIsAttributeManagerOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithAttributes | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfPathToView, setPdfPathToView] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentWithAttributes | null>(null);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'otp' | 'loading'>('confirm');
  const [otpCode, setOtpCode] = useState("");

  const { attributes, saveDocumentAttributes, getDocumentAttributes } = useCustomAttributes(workspaceId);

  const getSelectedDocumentTypeForFilters = () => {
    switch (documentTypeFilter) {
      case "Pagaré": return "Pagaré";
      case "Solicitud de Crédito": return "Solicitud de crédito";
      case "Consentimiento Informado": return "Consentimiento informado";
      default: return "";
    }
  };

  const selectedDocumentTypeForFilters = getSelectedDocumentTypeForFilters();
  const dynamicFilterConfigs = getFilterConfigsByDocumentType(selectedDocumentTypeForFilters);

  const getDocumentStatus = (fechaVencimiento?: string) => {
    if (!fechaVencimiento) return "vigente";

    const today = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diffTime = vencimiento.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "vencido";
    if (diffDays <= 30) return "por-vencer";
    return "vigente";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vencido": return "bg-destructive/10 text-destructive";
      case "por-vencer": return "bg-warning/10 text-warning";
      case "vigente": return "bg-success/10 text-success";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "vencido": return <AlertTriangle className="w-4 h-4" />;
      case "por-vencer": return <Clock className="w-4 h-4" />;
      case "vigente": return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "vencido": return "Vencido";
      case "por-vencer": return "Por vencer";
      case "vigente": return "Vigente";
      default: return "Desconocido";
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace(/\./g, ',').replace(/,([^,]*)$/, '.$1').replace(/,/g, '.');
  };

  const applyAdvancedFilters = (document: DocumentWithAttributes) => {
    return advancedFilters.every(filter => {
      let fieldValue: any;

      if (filter.field.startsWith('custom_')) {
        const customAttrName = filter.field.replace('custom_', '');
        const customValue = document.valores_atributos?.find(attr =>
          attr.atributos_personalizados.nombre === customAttrName
        );
        fieldValue = customValue?.valor;
      } else {
        fieldValue = document[filter.field as keyof DocumentWithAttributes];
      }

      if (fieldValue === undefined || fieldValue === null) return false;

      switch (filter.operator) {
        case "contains":
          return fieldValue.toString().toLowerCase().includes(filter.value.toString().toLowerCase());

        case "equals":
          if (typeof fieldValue === 'number' && typeof filter.value === 'number') {
            return fieldValue === filter.value;
          }
          return fieldValue.toString().toLowerCase() === filter.value.toString().toLowerCase();

        case "greaterThan":
          return Number(fieldValue) > Number(filter.value);

        case "lessThan":
          return Number(fieldValue) < Number(filter.value);

        case "between":
          if (filter.field.includes("fecha") || filter.field.includes("Fecha")) {
            const [fromDate, toDate] = filter.value.toString().split('|');
            if (!fromDate || !toDate) return true;

            const docDate = new Date(fieldValue.toString());
            const from = new Date(fromDate);
            const to = new Date(toDate);

            return docDate >= from && docDate <= to;
          }
          else if (typeof fieldValue === 'number') {
            const [minValue, maxValue] = filter.value.toString().split('|');
            if (!minValue || !maxValue) return true;

            const numValue = Number(fieldValue);
            const min = Number(minValue);
            const max = Number(maxValue);

            return numValue >= min && numValue <= max;
          }
          return true;

        case "before":
          const docDateBefore = new Date(fieldValue.toString());
          const beforeDate = new Date(filter.value.toString());
          return docDateBefore < beforeDate;

        case "after":
          const docDateAfter = new Date(fieldValue.toString());
          const afterDate = new Date(filter.value.toString());
          return docDateAfter > afterDate;

        default:
          return true;
      }
    });
  };

  const filteredDocuments = pagedDocuments.filter(doc => {
    const matchesSearch =
      doc.nombre_deudor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.id_deudor?.includes(searchTerm) ||
      doc.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDocumentType = documentTypeFilter === "all" || doc.tipo_documento === documentTypeFilter;

    const status = getDocumentStatus(doc.fecha_vencimiento);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    const matchesAdvancedFilters = applyAdvancedFilters(doc);

    return matchesSearch && matchesDocumentType && matchesStatus && matchesAdvancedFilters;
  });

  const handleDownload = async (document: DocumentWithAttributes) => {
    // Open confirmation modal instead of immediate download
    setDeleteTarget(document);
    setDeleteStep('confirm');
    setOtpCode("");
    setShowDeleteModal(true);
  };

  const handleViewDetails = (document: DocumentWithAttributes) => {
    setSelectedDocument(document);
    setShowDetailsModal(true);
  };

  const handleViewPdf = (document: DocumentWithAttributes) => {
    console.log("[DocumentsTable] open pdf viewer", { id: document.id, path: document.file_path });
    setPdfPathToView(document.file_path);
    setShowPdfViewer(true);
  };

  const handleUpload = () => {
    setShowUploadModal(true);
  };

  const handleDocumentUpload = (file: File, documentData: Partial<DocumentData>, customAttributes: Array<{ atributo_id: string; valor: string }>) => {
    if (!workspaceId || !usuario) return;

    uploadDocument({
      file,
      workspaceId,
      userId: usuario.id,
      documentData,
      customAttributes
    });

    setShowUploadModal(false);
  };

  const handleSaveAttributes = (attributes: CustomAttribute[]) => {
    console.log("Attributes updated successfully:", attributes);
  };

  const handleDelete = (document: DocumentWithAttributes) => {
    if (confirm('¿Estás seguro de eliminar este documento?')) {
      deleteDocument({ documentId: document.id, filePath: document.file_path });
    }
  };

  const handleSendOtp = async () => {
    if (!deleteTarget) return;
    setDeleteStep('loading');
    try {
      const functionsBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
      const { data: session } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(`${functionsBase}/send-otp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: deleteTarget.email || undefined, documentId: deleteTarget.id })
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('[DocumentsTable] send-otp error', json);
        setDeleteStep('confirm');
        return;
      }
      console.log('[DocumentsTable] send-otp response', json);
      setDeleteStep('otp');
    } catch (err) {
      console.error('[DocumentsTable] send-otp exception', err);
      setDeleteStep('confirm');
    }
  };

  const handleVerifyOtpAndDelete = async () => {
    if (!deleteTarget) return;
    setDeleteStep('loading');
    try {
      // Validate OTP client-side by querying `otp_codes` table and deleting the row if valid
      const { supabase } = await import('@/lib/supabase');
      console.log('[DocumentsTable] verifying otp client-side', { code: otpCode, documentId: deleteTarget.id });

      const { data: rows, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('code', otpCode)
        .eq('document_id', deleteTarget.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[DocumentsTable] otp query error', error);
        setDeleteStep('otp');
        return;
      }

      const row = (rows && rows[0]) || null;
      if (!row) {
        console.error('[DocumentsTable] otp not found');
        setDeleteStep('otp');
        return;
      }

      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        console.error('[DocumentsTable] otp expired', { expires_at: row.expires_at });
        setDeleteStep('otp');
        return;
      }

      // consume OTP (delete)
      const { error: delErr } = await supabase.from('otp_codes').delete().eq('id', row.id);
      if (delErr) {
        console.error('[DocumentsTable] failed to consume otp', delErr);
        setDeleteStep('otp');
        return;
      }

      // proceed to delete document
      // Log that the document was downloaded (OTP confirmed) before deletion
      try {
        await logActivity({
          accion: 'Documento descargado (OTP confirmado)',
          entidad_tipo: 'documento',
          entidad_nombre: deleteTarget.file_name || deleteTarget.file_path,
          entidad_id: deleteTarget.id
        } as any);
      } catch (e) {
        console.error('[DocumentsTable] logActivity download-before-delete error', e);
      }

      await deleteDocument({ documentId: deleteTarget.id, filePath: deleteTarget.file_path });
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error verifying OTP or deleting document:', err);
      setDeleteStep('otp');
    } finally {
      setOtpCode("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, ID o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="Pagaré">Pagaré</SelectItem>
                <SelectItem value="Solicitud de Crédito">Solicitud de crédito</SelectItem>
                <SelectItem value="Consentimiento Informado">Consentimiento informado</SelectItem>
              </SelectContent>
            </Select>

            {documentTypeFilter === "Pagaré" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="vigente">Vigentes</SelectItem>
                  <SelectItem value="por-vencer">Por vencer</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(true)}
              className="bg-background/50 relative"
            >
              <Settings className="w-4 h-4 mr-2" />
              Filtros Avanzados
              {advancedFilters.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 pointer-events-none h-5 w-5 p-0 text-[10px] flex items-center justify-center"
                >
                  {advancedFilters.length}
                </Badge>
              )}
            </Button>

            {userRole === "admin" && (
              <Button
                variant="outline"
                onClick={() => setIsAttributeManagerOpen(true)}
                className="bg-background/50 hover:bg-primary hover:text-primary-foreground"
              >
                <Settings className="w-4 h-4 mr-2" />
                Campos Personalizados
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ActiveFilters
        filters={advancedFilters}
        onRemoveFilter={(index) => {
          const updated = [...advancedFilters];
          updated.splice(index, 1);
          setAdvancedFilters(updated);
        }}
        onClearAll={() => setAdvancedFilters([])}
      />

      <AdvancedFiltersModal
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApplyFilters={setAdvancedFilters}
        availableFilters={dynamicFilterConfigs}
        currentFilters={advancedFilters}
        selectedDocumentType={selectedDocumentTypeForFilters}
        customAttributes={attributes}
        workspaceId={workspaceId}
      />

      <Card className="shadow-card border-0 bg-gradient-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Documentos ({total})
            </CardTitle>
            {userRole === "admin" && (
              <Button onClick={handleUpload} className="bg-gradient-primary" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Cargar documento
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>ID Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Deudor</TableHead>
                  <TableHead>Valor (COP)</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay documentos para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => {
                    const status = getDocumentStatus(doc.fecha_vencimiento);
                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">{doc.id.substring(0, 8)}...</TableCell>
                        <TableCell>{doc.tipo_documento}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{doc.nombre_deudor || 'Sin nombre'}</div>
                            <div className="text-sm text-muted-foreground">{doc.id_deudor || 'Sin ID'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatCurrency(doc.valor_titulo)}
                        </TableCell>
                        <TableCell>
                          {doc.fecha_vencimiento ? format(new Date(doc.fecha_vencimiento), "dd MMM yyyy", { locale: es }) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(status)}
                            {getStatusLabel(status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(doc)}
                              className="bg-background/50 hover:bg-primary hover:text-primary-foreground"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewPdf(doc)}
                              className="text-primary p-2"
                              aria-label="Ver PDF"
                              title="Ver PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            {userRole !== "viewer" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(doc)}
                                className="bg-background/50 hover:bg-primary hover:text-primary-foreground"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            {userRole === "admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(doc)}
                                className="bg-background/50 hover:bg-destructive hover:text-destructive-foreground"
                                disabled={isDeleting}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="text-sm text-muted-foreground">Mostrando página {page} de {Math.max(1, Math.ceil(total / pageSize))}</div>
          <div className="flex items-center gap-2">
            {/* Primera / Anterior */}
            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setPage(1)} disabled={page === 1}>
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Page numbers with ellipsis */}
            {(() => {
              const totalPages = Math.max(1, Math.ceil(total / pageSize));
              const pages: (number | '...')[] = [];

              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                const left = Math.max(2, page - 1);
                const right = Math.min(totalPages - 1, page + 1);

                pages.push(1);
                if (left > 2) pages.push('...');

                for (let i = left; i <= right; i++) pages.push(i);

                if (right < totalPages - 1) pages.push('...');
                pages.push(totalPages);
              }

              return pages.map((pNum, idx) => {
                if (pNum === '...') {
                  return (
                    <div key={`dots-${idx}`} className="px-2 text-muted-foreground">…</div>
                  );
                }

                const isCurrent = pNum === page;
                return (
                  <Button
                    key={`page-${pNum}`}
                    size="sm"
                    onClick={() => setPage(Number(pNum))}
                    className={`h-8 w-8 rounded-full ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-background/50 hover:bg-primary/10'}`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {pNum}
                  </Button>
                );
              });
            })()}

            {/* Siguiente / Última */}
            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil(total / pageSize)), p + 1))} disabled={page >= Math.ceil(Math.max(1, total) / pageSize)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setPage(Math.max(1, Math.ceil(total / pageSize)))} disabled={page === Math.max(1, Math.ceil(total / pageSize))}>
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {userRole === "admin" && (
        <DocumentUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleDocumentUpload}
          isUploading={isUploading}
          workspaceId={workspaceId}
        />
      )}

      {userRole === "admin" && (
        <AttributeManager
          isOpen={isAttributeManagerOpen}
          onClose={() => setIsAttributeManagerOpen(false)}
          onSave={handleSaveAttributes}
          workspaceId={workspaceId}
        />
      )}

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Documento</DialogTitle>
            <DialogDescription>
              Información detallada del documento seleccionado
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Datos Básicos</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID Documento</label>
                    <p className="font-medium">{selectedDocument.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Documento</label>
                    <p className="font-medium">{selectedDocument.tipo_documento}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nombre del Archivo</label>
                    <p className="font-medium">{selectedDocument.file_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tamaño</label>
                    <p className="font-medium">{(selectedDocument.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <p className="font-medium">{selectedDocument.estado}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</label>
                    <p className="font-medium">
                      {format(new Date(selectedDocument.created_at), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              </div>

              {(selectedDocument.nombre_deudor || selectedDocument.id_deudor) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Información del Deudor</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDocument.nombre_deudor && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                        <p className="font-medium">{selectedDocument.nombre_deudor}</p>
                      </div>
                    )}
                    {selectedDocument.id_deudor && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">ID</label>
                        <p className="font-medium">{selectedDocument.id_deudor}</p>
                      </div>
                    )}
                    {selectedDocument.telefono && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                        <p className="font-medium">{selectedDocument.telefono}</p>
                      </div>
                    )}
                    {selectedDocument.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="font-medium">{selectedDocument.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedDocument.valores_atributos && selectedDocument.valores_atributos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Atributos Personalizados</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDocument.valores_atributos.map((attr) => (
                      <div key={attr.id}>
                        <label className="text-sm font-medium text-muted-foreground">
                          {attr.atributos_personalizados.nombre}
                        </label>
                        <p className="font-medium">{attr.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfViewer} onOpenChange={(open) => { setShowPdfViewer(open); if (!open) { setPdfPathToView(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visor PDF</DialogTitle>
            <DialogDescription>Visualización segura del documento</DialogDescription>
          </DialogHeader>

          <div className="h-[75vh]">
            {pdfPathToView ? (
              <PdfViewerNoDownload path={pdfPathToView} watermarkText={usuario?.email} />
            ) : (
              <div className="flex items-center justify-center h-full">Seleccione un documento para ver</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              Este documento será eliminado de la base de datos porque está siendo retirado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {deleteStep === 'confirm' && (
              <div>
                <p className="text-sm text-muted-foreground">¿Estás seguro que quieres continuar? Al confirmar se enviará un código OTP a tu correo para validar la eliminación.</p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
                  <Button onClick={handleSendOtp}>Confirmar y Enviar código</Button>
                </div>
              </div>
            )}

            {deleteStep === 'loading' && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Enviando...
              </div>
            )}

            {deleteStep === 'otp' && (
              <div>
                <p className="text-sm text-muted-foreground">Ingresa el código OTP enviado a tu correo para confirmar la eliminación.</p>
                <div className="mt-3">
                  <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Código OTP" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setShowDeleteModal(false); setDeleteStep('confirm'); }}>Cancelar</Button>
                  <Button onClick={handleVerifyOtpAndDelete}>Verificar y Eliminar</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

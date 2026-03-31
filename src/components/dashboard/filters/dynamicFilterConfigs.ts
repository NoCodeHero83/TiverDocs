import { FilterConfig } from "./types";

// Campos fijos para todos los tipos de documento
const commonFields: FilterConfig[] = [
  { field: "empresa", label: "Empresa", type: "text" },
  { field: "proceso", label: "Proceso (Serie)", type: "text" },
  { field: "subproceso", label: "Subproceso (Subserie)", type: "text" },
  { field: "fechaIngreso", label: "Fecha de Ingreso", type: "date" },
  { field: "id", label: "ID", type: "text" }
];

// Campos específicos para Pagaré
const pagareFields: FilterConfig[] = [
  { field: "nombreDeudor", label: "Nombre Deudor", type: "text" },
  { field: "nombreCodeudor", label: "Nombre Codeudor", type: "text" },
  { field: "idDeudor", label: "ID Deudor", type: "text" },
  { field: "idCodeudor", label: "ID Codeudor", type: "text" },
  { field: "fechaVencimiento", label: "Fecha de Vencimiento", type: "date" },
  { field: "valorTitulo", label: "Valor del Título", type: "number" }
];

// Campos específicos para Solicitud de Crédito
const solicitudCreditoFields: FilterConfig[] = [
  { field: "nombreDeudor", label: "Nombre Deudor", type: "text" },
  { field: "nombreCodeudor", label: "Nombre Codeudor", type: "text" },
  { field: "idDeudor", label: "ID Deudor", type: "text" },
  { field: "idCodeudor", label: "ID Codeudor", type: "text" },
  { field: "montoSolicitado", label: "Monto Solicitado", type: "number" },
  { field: "montoAprobado", label: "Monto Aprobado", type: "number" },
  { field: "ciudad", label: "Ciudad", type: "text" },
  { field: "sucursal", label: "Sucursal", type: "text" },
  { field: "lineaCredito", label: "Línea de Crédito", type: "text" }
];

// Campos específicos para Consentimiento Informado
const consentimientoFields: FilterConfig[] = [
  { field: "paciente", label: "Paciente", type: "text" },
  { field: "idPaciente", label: "ID Paciente", type: "text" },
  { field: "acudiente", label: "Acudiente", type: "text" },
  { field: "idAcudiente", label: "ID Acudiente", type: "text" },
  { field: "patologia", label: "Patología", type: "text" },
  { field: "areaProcedimiento", label: "Área de Procedimiento", type: "text" },
  { field: "clinica", label: "Clínica", type: "text" },
  { field: "ciudad", label: "Ciudad", type: "text" }
];

export const getFilterConfigsByDocumentType = (documentType: string): FilterConfig[] => {
  switch (documentType) {
    case "Pagaré":
      return [...commonFields, ...pagareFields];
    case "Solicitud de crédito":
      return [...commonFields, ...solicitudCreditoFields];
    case "Consentimiento informado":
      return [...commonFields, ...consentimientoFields];
    default:
      // Si no hay tipo seleccionado, mostrar solo campos comunes
      return commonFields;
  }
};

export const getFilterCategoriesByDocumentType = (documentType: string, availableFilters: FilterConfig[], customAttributes: any[] = []) => {
  const common = availableFilters.filter(f => commonFields.some(cf => cf.field === f.field));
  
  // Convert custom attributes to FilterConfig format
  const customFilters: FilterConfig[] = customAttributes
    .filter(attr => attr.documentTypes.includes(documentType))
    .map(attr => ({
      field: `custom_${attr.name}`,
      label: attr.label,
      type: attr.type,
      options: attr.options
    }));
  
  let standardVariables: FilterConfig[] = [];
  
  switch (documentType) {
    case "Pagaré":
      standardVariables = availableFilters.filter(f => pagareFields.some(pf => pf.field === f.field));
      break;
    case "Solicitud de crédito":
      standardVariables = availableFilters.filter(f => solicitudCreditoFields.some(scf => scf.field === f.field));
      break;
    case "Consentimiento informado":
      standardVariables = availableFilters.filter(f => consentimientoFields.some(cf => cf.field === f.field));
      break;
    default:
      standardVariables = [];
      break;
  }
  
  return {
    fijos: common,
    variables: [...standardVariables, ...customFilters],
  };
};
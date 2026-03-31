import { FilterConfig } from "./types";

export const documentFilterConfigs: FilterConfig[] = [
  // General fields
  { field: "id", label: "ID Documento", type: "text" },
  { field: "nombreDeudor", label: "Nombre Deudor", type: "text" },
  { field: "nombreCodeudor", label: "Nombre Codeudor", type: "text" },
  { field: "idDeudor", label: "ID Deudor", type: "text" },
  { field: "idCodeudor", label: "ID Codeudor", type: "text" },
  { 
    field: "tipoDocumento", 
    label: "Tipo de Documento", 
    type: "select",
    options: ["Pagaré", "Solicitud de Crédito", "Consentimiento Informado", "Contrato de Crédito"]
  },
  
  // Financial fields
  { field: "valorTitulo", label: "Valor del Título", type: "number" },
  { field: "tasaInteres", label: "Tasa de Interés", type: "number" },
  { field: "plazoCredito", label: "Plazo de Crédito", type: "number" },
  { field: "ingresosMensuales", label: "Ingresos Mensuales", type: "number" },
  { field: "patrimonio", label: "Patrimonio", type: "number" },
  { field: "valorGarantia", label: "Valor de Garantía", type: "number" },
  { field: "valorMora", label: "Valor en Mora", type: "number" },
  { field: "scoring", label: "Scoring Crediticio", type: "number" },
  
  // Date fields
  { field: "fechaVencimiento", label: "Fecha de Vencimiento", type: "date" },
  { field: "fechaIngreso", label: "Fecha de Ingreso", type: "date" },
  { field: "fechaFirmaTitle", label: "Fecha de Firma", type: "date" },
  { field: "fechaCaducidad", label: "Fecha de Caducidad", type: "date" },
  { field: "fechaConstruccion", label: "Fecha de Construcción", type: "date" },
  { field: "fechaUltimaGestion", label: "Fecha Última Gestión", type: "date" },
  { field: "fechaProximaAccion", label: "Fecha Próxima Acción", type: "date" },
  
  // Personal information
  { 
    field: "tipoPersona", 
    label: "Tipo de Persona", 
    type: "select",
    options: ["Natural", "Jurídica"]
  },
  { 
    field: "genero", 
    label: "Género", 
    type: "select",
    options: ["Masculino", "Femenino"]
  },
  { 
    field: "estadoCivil", 
    label: "Estado Civil", 
    type: "select",
    options: ["Soltero", "Casado", "Unión Libre", "Divorciado", "Viudo"]
  },
  { 
    field: "nivelEducativo", 
    label: "Nivel Educativo", 
    type: "select",
    options: ["Primaria", "Secundaria", "Técnico", "Tecnólogo", "Universitario", "Postgrado"]
  },
  { field: "ocupacion", label: "Ocupación", type: "text" },
  { field: "actividadEconomica", label: "Actividad Económica", type: "text" },
  
  // Process and collection
  { field: "proceso", label: "Proceso", type: "text" },
  { field: "subproceso", label: "Subproceso", type: "text" },
  { 
    field: "estado", 
    label: "Estado", 
    type: "select",
    options: ["Activo", "Inactivo", "Vencido"]
  },
  { 
    field: "etapaCobranza", 
    label: "Etapa de Cobranza", 
    type: "select",
    options: ["Preventiva", "Administrativa", "Jurídica", "Prejudicial"]
  },
  { field: "diasMora", label: "Días en Mora", type: "number" },
  { field: "gestorAsignado", label: "Gestor Asignado", type: "text" },
  { field: "resultadoUltimaGestion", label: "Resultado Última Gestión", type: "text" },
  { field: "proximaAccion", label: "Próxima Acción", type: "text" },
  
  // Location fields
  { field: "ciudad", label: "Ciudad", type: "text" },
  { field: "departamento", label: "Departamento", type: "text" },
  { field: "ciudadExpedicion", label: "Ciudad de Expedición", type: "text" },
  { field: "direccion", label: "Dirección", type: "text" },
  
  // Contact fields
  { field: "telefono", label: "Teléfono", type: "text" },
  { field: "email", label: "Email", type: "text" },
  
  // Additional fields
  { field: "garantia", label: "Garantía", type: "text" },
  { field: "observaciones", label: "Observaciones", type: "text" },
  { 
    field: "experienciaCrediticia", 
    label: "Experiencia Crediticia", 
    type: "select",
    options: ["Sin experiencia", "Buena", "Regular", "Mala"]
  }
];
export interface FilterConfig {
  field: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  options?: string[];
}

export interface FilterValue {
  field: string;
  operator: string;
  value: string | number;
  label: string;
}

export interface ActiveFilter extends FilterValue {
  id: string;
}
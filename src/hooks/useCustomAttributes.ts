import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Ajusta según tu cliente

export interface CustomAttribute {
  id: string; // UUID generado por la BD
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  documentTypes: string[];
  options?: string[];
  required: boolean;
  workspaceId?: string | null;
}

export interface DocumentAttributeValue {
  attributeId: string;
  value: string | number;
}

// Hook mejorado para usar la base de datos
export const useCustomAttributes = (workspaceId?: string) => {
  const [attributes, setAttributes] = useState<CustomAttribute[]>([]);
  const [documentAttributes, setDocumentAttributes] = useState<Record<string, DocumentAttributeValue[]>>({});

  // Cargar atributos desde la BD
  const loadAttributes = async () => {
    try {
      let query: any = supabase.from("atributos_personalizados").select("*").order('nombre', { ascending: true });
      if (workspaceId) {
        // return globals (workspace_id IS NULL) and workspace-specific
        query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
      } else {
        // only global
        query = query.is('workspace_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        // Mapear el campo 'nombre' a 'name' y 'tipo' a 'type'
        const mapped: CustomAttribute[] = data.map((attr) => ({
          id: attr.id,
          name: attr.nombre,
          label: attr.nombre, // o usar otro campo si lo tienes para label
          type: attr.tipo,
          documentTypes: attr.tipos_documento || [],
          options: attr.opciones || [],
          required: attr.requerido || false,
          // include workspace id so UI can show if global or workspace-specific
          workspaceId: attr.workspace_id || null
        }));
        setAttributes(mapped);
      }
    } catch (error) {
      console.error("Error loading custom attributes from DB:", error);
    }
  };

  // Cargar valores de atributos de documentos
  const loadDocumentAttributes = async () => {
    try {
      const { data, error } = await supabase
        .from("valores_atributos")
        .select("*");
      if (error) throw error;

      if (data) {
        const mapped: Record<string, DocumentAttributeValue[]> = {};
        data.forEach((item) => {
          if (!mapped[item.documento_id]) mapped[item.documento_id] = [];
          mapped[item.documento_id].push({
            attributeId: item.atributo_id,
            value: item.valor
          });
        });
        setDocumentAttributes(mapped);
      }
    } catch (error) {
      console.error("Error loading document attributes:", error);
    }
  };

  useEffect(() => {
    loadAttributes();
    loadDocumentAttributes();
  }, []);

  // Crear un atributo personalizado en la BD
  const createAttribute = async (attr: Omit<CustomAttribute, "id">, workspaceIdParam?: string) => {
    try {
      const { data, error } = await supabase
        .from('atributos_personalizados')
        .insert({
          nombre: attr.name,
          tipo: attr.type,
          tipos_documento: attr.documentTypes,
          opciones: attr.options || [],
          requerido: attr.required,
          workspace_id: workspaceIdParam || null
        })
        .select()
        .single();

      if (error) throw error;
      await loadAttributes();
      return data;
    } catch (error) {
      console.error('Error creating custom attribute:', error);
      throw error;
    }
  };

  const updateAttribute = async (id: string, updates: Partial<Omit<CustomAttribute, 'id'>>) => {
    try {
      const { data, error } = await supabase
        .from('atributos_personalizados')
        .update({
          nombre: updates.name,
          tipo: updates.type,
          tipos_documento: updates.documentTypes,
          opciones: updates.options || [],
          requerido: updates.required
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await loadAttributes();
      return data;
    } catch (error) {
      console.error('Error updating custom attribute:', error);
      throw error;
    }
  };

  const deleteAttribute = async (id: string) => {
    try {
      const { error } = await supabase.from('atributos_personalizados').delete().eq('id', id);
      if (error) throw error;
      await loadAttributes();
    } catch (error) {
      console.error('Error deleting custom attribute:', error);
      throw error;
    }
  };

  // Guardar valores de atributos de un documento
  const saveDocumentAttributes = async (documentId: string, attrs: DocumentAttributeValue[]) => {
    try {
      // Primero elimina los anteriores valores de ese documento para no duplicar
      const { error: deleteError } = await supabase
        .from("valores_atributos")
        .delete()
        .eq("documento_id", documentId);
      if (deleteError) throw deleteError;

      // Inserta los nuevos valores
      const { error: insertError } = await supabase
        .from("valores_atributos")
        .insert(
          attrs.map(a => ({
            documento_id: documentId,
            atributo_id: a.attributeId,
            valor: a.value.toString()
          }))
        );
      if (insertError) throw insertError;

      // Actualiza estado local
      setDocumentAttributes(prev => ({
        ...prev,
        [documentId]: attrs
      }));
    } catch (error) {
      console.error("Error saving document attributes:", error);
    }
  };

  // Filtrar atributos por tipo de documento
  const getAttributesForDocumentType = (documentType: string): CustomAttribute[] => {
    return attributes.filter(attr => attr.documentTypes.includes(documentType));
  };

  // Obtener atributos de un documento específico
  const getDocumentAttributes = (documentId: string): DocumentAttributeValue[] => {
    return documentAttributes[documentId] || [];
  };

  return {
    attributes,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    getAttributesForDocumentType,
    documentAttributes,
    saveDocumentAttributes,
    getDocumentAttributes
  };
};

import React, { useEffect, useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

type Props = {
  path: string;
  watermarkText?: string;
};

export default function PdfViewerNoDownload({ path, watermarkText }: Props) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    async function load() {
      try {
        console.log("[PdfViewer] load start", { path });
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        console.log("[PdfViewer] session token present:", !!token);
        if (!token) {
          setError("Usuario no autenticado");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        const functionsBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
        const fetchUrl = `${functionsBase}/stream-pdf`;
        console.log("[PdfViewer] fetching from:", fetchUrl, { path });

        const res = await fetch(fetchUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path }),
        });
        console.log("[PdfViewer] fetch response status:", res.status);

        if (!res.ok) {
          const text = await res.text().catch(() => "(no body)");
          console.error("[PdfViewer] Error fetching PDF:", res.status, text);
          setError(`Error ${res.status}: ${text}`);
          setLoading(false);
          return;
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        console.log("[PdfViewer] created object URL", objectUrl);
        if (mounted) setFileUrl(objectUrl);
        if (mounted) setLoading(false);
      } catch (err) {
        console.error("[PdfViewer] exception:", err);
        setError(String(err));
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (loading) return <div className="flex items-center justify-center h-full">Cargando PDF…</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!fileUrl) return <div>No se pudo cargar el documento.</div>;

  return (
    <div onContextMenu={(e) => e.preventDefault()} style={{ position: "relative", height: "100%" }}>
      {/* Prevent text selection in viewer text layers */}
      <style>{`
        /* react-pdf-viewer text layer */
        .rpv-core__text-layer,
        .react-pdf__Page__textContent,
        .rpv-core__viewer,
        .rpv-core__page-layer {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
      `}</style>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer fileUrl={fileUrl} />
      </Worker>

      {watermarkText && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.08,
            fontSize: 36,
            transform: "rotate(-20deg)",
            color: "#000",
          }}
        >
          {watermarkText}
        </div>
      )}
    </div>
  );
}

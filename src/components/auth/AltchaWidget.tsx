import { useEffect, useRef } from "react";
import "altcha";

// Definimos el tipo como any para evitar conflictos con las declaraciones internas del paquete altcha
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "altcha-widget": any;
    }
  }
}

interface AltchaWidgetProps {
  onVerify: (payload: string | null) => void;
  challengeUrl?: string; // URL del servidor de ALTCHA si existe
}

export const AltchaWidget = ({ onVerify, challengeUrl }: AltchaWidgetProps) => {
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const handleStateChange = (event: any) => {
      const { state, payload } = event.detail || {};
      console.log(`[Altcha] State changed to: ${state}`, event.detail);

      if (state === "verified" || payload) {
        console.log("[Altcha] Verification successful!");
        onVerify(payload || "verified");
      } else if (state === "unverified" || state === "error" || state === "expired") {
        console.warn(`[Altcha] Verification failed/reset: ${state}`);
        onVerify(null);
      }
    };

    const currentWidget = widgetRef.current;
    if (currentWidget) {
      currentWidget.addEventListener("statechange", handleStateChange);
    }

    return () => {
      if (currentWidget) {
        currentWidget.removeEventListener("statechange", handleStateChange);
      }
    };
  }, [onVerify]);

  return (
    <div className="flex justify-center w-full my-4 min-h-[80px]">
      <altcha-widget
        ref={widgetRef}
        challengeurl={challengeUrl || undefined}
        // El atributo 'test' en React debe ser booleano para el Web Component de Altcha 2.x
        test={!challengeUrl} 
        hidefooter={true}
      ></altcha-widget>
    </div>
  );
};

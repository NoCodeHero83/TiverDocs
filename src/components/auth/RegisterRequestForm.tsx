import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Building, Mail, User, ArrowLeft, CheckCircle } from "lucide-react";

interface RegisterRequestFormProps {
  onBack: () => void;
  onSubmit: (data: RegisterRequestData) => void;
}

interface RegisterRequestData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
}

export const RegisterRequestForm = ({ onBack, onSubmit }: RegisterRequestFormProps) => {
  const [formData, setFormData] = useState<RegisterRequestData>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    message: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof RegisterRequestData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <Card className="shadow-elevated border-0 bg-gradient-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <CardTitle className="text-xl text-success">Solicitud Enviada</CardTitle>
          <CardDescription>
            Hemos recibido tu solicitud de acceso para <strong>{formData.companyName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo en un plazo máximo de 2 días hábiles.
            </p>
            <Button 
              onClick={onBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevated border-0 bg-gradient-card">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Solicitar Acceso</CardTitle>
        <CardDescription>
          Completa el formulario para solicitar acceso a TiverDocs para tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Nombre de la empresa
              </Label>
              <Input
                id="company-name"
                type="text"
                placeholder="Empresa S.A.S."
                value={formData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nombre del contacto
              </Label>
              <Input
                id="contact-name"
                type="text"
                placeholder="Juan Pérez"
                value={formData.contactName}
                onChange={(e) => handleChange("contactName", e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Correo electrónico
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contacto@empresa.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+57 300 123 4567"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensaje adicional (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Describe brevemente tus necesidades o cualquier información adicional..."
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              className="bg-background/50 min-h-[80px]"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? "Enviando..." : "Enviar Solicitud"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
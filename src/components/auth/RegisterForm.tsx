import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, User, Mail, MapPin, Phone, Briefcase, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const RegisterForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    empresa: "",
    cargo: "",
    correo: "",
    pais: "",
    celular: ""
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulamos el envío al superadmin
    console.log("Solicitud de registro:", formData);
    setIsSubmitted(true);
    toast({
      title: "Solicitud enviada",
      description: "Nos pondremos en contacto contigo pronto para configurar tu cuenta.",
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-elevated border-0 bg-gradient-card">
          <CardContent className="pt-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Solicitud Recibida!</h2>
            <p className="text-muted-foreground mb-6">
              Hemos recibido tu solicitud de acceso. Nuestro equipo se pondrá en contacto contigo 
              en las próximas 24 horas para configurar tu workspace empresarial.
            </p>
            <Button asChild className="bg-gradient-primary">
              <a href="/">Volver al inicio</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Solicitar Acceso
          </h1>
          <p className="text-muted-foreground">
            Completa el formulario para solicitar acceso a TiverDocs
          </p>
        </div>

        <Card className="shadow-elevated border-0 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Información Empresarial
            </CardTitle>
            <CardDescription>
              Proporciónanos los datos de tu empresa para configurar tu workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nombre completo
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleChange("nombre", e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Empresa
                  </Label>
                  <Input
                    id="empresa"
                    value={formData.empresa}
                    onChange={(e) => handleChange("empresa", e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Cargo
                  </Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => handleChange("cargo", e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo empresarial
                  </Label>
                  <Input
                    id="correo"
                    type="email"
                    value={formData.correo}
                    onChange={(e) => handleChange("correo", e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pais" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    País
                  </Label>
                  <Select onValueChange={(value) => handleChange("pais", value)}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Selecciona país" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="MX">México</SelectItem>
                      <SelectItem value="PE">Perú</SelectItem>
                      <SelectItem value="CL">Chile</SelectItem>
                      <SelectItem value="AR">Argentina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Celular
                  </Label>
                  <Input
                    id="celular"
                    type="tel"
                    value={formData.celular}
                    onChange={(e) => handleChange("celular", e.target.value)}
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity">
                Enviar Solicitud
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <a href="/" className="text-primary hover:text-primary/80 transition-colors">
            Iniciar sesión
          </a>
        </div>
      </div>
    </div>
  );
};
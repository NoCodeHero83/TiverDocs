import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, MoreHorizontal, Trash2, UserCheck, UserX, Filter, Loader2, Eye, EyeOff, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUsers, UserRole, UserWithWorkspaces } from "@/hooks/useUsers";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useEffect } from 'react';
import { getPendingRegisterRequests, approveRegisterRequest, rejectRegisterRequest, RegisterRequest } from '@/services/registerRequestService';
import { useToast } from "@/hooks/use-toast";

export const UsersManager = () => {
  const { toast } = useToast();

  // Solicitudes pendientes (debe estar dentro del componente)
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<RegisterRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState<RegisterRequest | null>(null);

  const fetchPendingRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await getPendingRegisterRequests();
      setPendingRequests(data);
    } catch (e) {
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (showRequestsDialog) fetchPendingRequests();
  }, [showRequestsDialog]);

  const handleApproveRequest = async (request: RegisterRequest) => {
    // En lugar de aprobar directamente, abrimos el modal de crear usuario con los datos
    setShowRequestsDialog(false);
    setPendingApprovalRequest(request);
    setFormData({
      full_name: request.contact_name,
      email: request.email,
      password: "",
      rol: "Administrador",
      workspaceIds: []
    });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleRejectRequest = async (id: string) => {
    setActionLoading(id);
    try {
      await rejectRegisterRequest(id);
      await fetchPendingRequests();
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo rechazar la solicitud.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };
  const { users, loading: usersLoading, createUser, updateUser, toggleUserStatus, deleteUser } = useUsers();
  const { workspaces, loading: workspacesLoading } = useWorkspaces();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithWorkspaces | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    rol: "Visualizador" as UserRole,
    workspaceIds: [] as string[]
  });

  const flattenedUsers = useMemo(() => {
    return users.flatMap(user => {
      if (user.workspaces.length === 0) {
        return [{
          ...user,
          workspace_name: '-',
          workspace_id: null,
          workspace_rol: user.rol
        }];
      }
      return user.workspaces.map(ws => ({
        ...user,
        workspace_name: ws.workspace_name,
        workspace_id: ws.workspace_id,
        workspace_rol: ws.rol
      }));
    });
  }, [users]);

  const filteredUsers = useMemo(() => {
    return flattenedUsers.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWorkspace = selectedWorkspace === "all" || user.workspace_id === selectedWorkspace;
      const matchesRole = selectedRole === "all" || user.workspace_rol === selectedRole;

      return matchesSearch && matchesWorkspace && matchesRole;
    });
  }, [flattenedUsers, searchTerm, selectedWorkspace, selectedRole]);

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  const handleOpenCreateDialog = () => {
    setEditingUser(null);
    setPendingApprovalRequest(null); // Limpiar solicitud pendiente
    setFormData({
      full_name: "",
      email: "",
      password: "",
      rol: "Visualizador",
      workspaceIds: []
    });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user: UserWithWorkspaces) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: "", // No mostrar la contraseña actual por seguridad
      rol: user.rol,
      workspaceIds: user.workspaces.map(ws => ws.workspace_id)
    });
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.email || formData.workspaceIds.length === 0) {
      return;
    }

    // Validación adicional para creación: contraseña requerida
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      return;
    }

    try {
      if (editingUser) {
        // Editar usuario existente
        await updateUser(editingUser.id, {
          full_name: formData.full_name,
          email: formData.email,
          rol: formData.rol,
          workspaceIds: formData.workspaceIds,
          ...(formData.password && { password: formData.password }) // Solo actualizar contraseña si se proporciona
        });
      } else {
        // Crear nuevo usuario
        await createUser({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          rol: formData.rol,
          workspaceIds: formData.workspaceIds
        });

        // Si viene de una solicitud pendiente, marcarla como aprobada
        if (pendingApprovalRequest) {
          await approveRegisterRequest(pendingApprovalRequest.id);
          toast({
            title: "Usuario creado y solicitud aprobada",
            description: `El usuario ${formData.full_name} ha sido creado y la solicitud ha sido aprobada.`
          });
          setPendingApprovalRequest(null);
        }
      }

      setFormData({
        full_name: "",
        email: "",
        password: "",
        rol: "Visualizador",
        workspaceIds: []
      });
      setShowPassword(false);
      setIsDialogOpen(false);
      setEditingUser(null);
      setPendingApprovalRequest(null);
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Si se cierra el diálogo sin guardar y había una solicitud pendiente, limpiarla
      setPendingApprovalRequest(null);
    }
  };

  const handleWorkspaceToggle = (workspaceId: string) => {
    const isSelected = formData.workspaceIds.includes(workspaceId);

    if (isSelected) {
      setFormData({
        ...formData,
        workspaceIds: formData.workspaceIds.filter(id => id !== workspaceId)
      });
    } else {
      setFormData({
        ...formData,
        workspaceIds: [...formData.workspaceIds, workspaceId]
      });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: 'Activo' | 'Inactivo') => {
    try {
      await toggleUserStatus(userId, currentStatus);
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      try {
        await deleteUser(userId);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SuperAdmin":
        return "destructive";
      case "Administrador":
        return "default";
      case "Visualizador":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const isFormValid = () => {
    const basicFieldsValid = formData.full_name && formData.email && formData.workspaceIds.length > 0;

    if (editingUser) {
      // Para edición, la contraseña es opcional
      return basicFieldsValid;
    } else {
      // Para creación, la contraseña es requerida
      return basicFieldsValid && formData.password && formData.password.length >= 6;
    }
  };

  if (usersLoading || workspacesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Administra usuarios y sus permisos por workspace
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowRequestsDialog(true)} variant="outline" className="gap-2">
                Ver solicitudes pendientes
              </Button>
              <Button onClick={handleOpenCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </Button>
            </div>
            {/* Dialogo de solicitudes pendientes */}
            <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Solicitudes de registro pendientes</DialogTitle>
                  <DialogDescription>Revisa y gestiona las solicitudes de acceso enviadas por empresas.</DialogDescription>
                </DialogHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Mensaje</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingRequests ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">Cargando...</TableCell>
                        </TableRow>
                      ) : pendingRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">No hay solicitudes pendientes</TableCell>
                        </TableRow>
                      ) : (
                        pendingRequests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>{req.company_name}</TableCell>
                            <TableCell>{req.contact_name}</TableCell>
                            <TableCell>{req.email}</TableCell>
                            <TableCell>{req.phone}</TableCell>
                            <TableCell>{req.message}</TableCell>
                            <TableCell>{new Date(req.created_at).toLocaleString('es-CO')}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="default" disabled={actionLoading === req.id} onClick={() => handleApproveRequest(req)}>
                                  {actionLoading === req.id ? 'Aprobando...' : 'Aceptar'}
                                </Button>
                                <Button size="sm" variant="destructive" disabled={actionLoading === req.id} onClick={() => handleRejectRequest(req.id)}>
                                  {actionLoading === req.id ? 'Rechazando...' : 'Rechazar'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los workspaces</SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Visualizador">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={`${user.id}-${user.workspace_id || 'no-workspace'}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.workspace_name}</div>
                      {user.workspace_id && (
                        <div className="text-xs text-muted-foreground">
                          ID: {user.workspace_id.substring(0, 8)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.workspace_rol)}>
                        {user.workspace_rol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.estado === "Activo" ? "default" : "secondary"}>
                        {user.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(user.ultimo_acceso)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(user.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user.id, user.estado)}>
                            {user.estado === "Activo" ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : pendingApprovalRequest ? 'Crear Usuario desde Solicitud' : 'Crear Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? `Modifica la información de ${editingUser.full_name}.`
                : pendingApprovalRequest
                  ? `Crea un usuario para la solicitud de ${pendingApprovalRequest.company_name}. La solicitud se marcará como aprobada al crear el usuario.`
                  : 'Agrega un nuevo usuario y asígnalo a uno o más workspaces.'
              }
            </DialogDescription>
          </DialogHeader>

          {pendingApprovalRequest && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                📋 Solicitud pendiente
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Empresa: <strong>{pendingApprovalRequest.company_name}</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Teléfono: {pendingApprovalRequest.phone || 'No proporcionado'}
              </p>
              {pendingApprovalRequest.message && (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Mensaje: {pendingApprovalRequest.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <Label htmlFor="email">Correo electrónico *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ej: juan@empresa.com"
                disabled={!!editingUser} // No permitir cambiar email al editar
              />
              {editingUser && (
                <p className="text-xs text-muted-foreground mt-1">
                  El correo electrónico no se puede modificar
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password">
                Contraseña {editingUser ? '' : '*'}
                {editingUser && <span className="text-muted-foreground text-xs"> (opcional)</span>}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                >
                  Generar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {editingUser
                  ? 'Completa solo si deseas cambiar la contraseña'
                  : 'La contraseña debe tener al menos 6 caracteres'
                }
              </p>
            </div>

            <div>
              <Label htmlFor="workspaces">Workspaces *</Label>
              <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                {workspaces.map((workspace) => (
                  <div key={workspace.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={workspace.id}
                      checked={formData.workspaceIds.includes(workspace.id)}
                      onCheckedChange={() => handleWorkspaceToggle(workspace.id)}
                    />
                    <Label
                      htmlFor={workspace.id}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {workspace.name}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.workspaceIds.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.workspaceIds.length} workspace(s) seleccionado(s)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="rol">Rol *</Label>
              <Select
                value={formData.rol}
                onValueChange={(value) => setFormData({ ...formData, rol: value as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid()}
            >
              {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
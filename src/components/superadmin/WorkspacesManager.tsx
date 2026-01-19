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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Power, Users, Calendar, Loader as Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useUsers } from '@/hooks/useUsers';
import { createRegisterRequest } from '@/services/registerRequestService';
import { useAuth } from '@/contexts/AuthContext';

export const WorkspacesManager = () => {
  const { workspaces, loading, createWorkspace, toggleWorkspaceStatus, deleteWorkspace, updateWorkspace } = useWorkspaces();
  const { users } = useUsers();
  const auth = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    description: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState({
    id: "",
    name: "",
    description: "",
  });

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(workspace =>
      workspace.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workspace.description && workspace.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [workspaces, searchTerm]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name) {
      return;
    }

    try {
      const created = await createWorkspace({
        name: newWorkspace.name,
        description: newWorkspace.description || undefined
      });

      // Crear solicitudes de registro (invitaciones) para cada email añadido
      if (invitedEmails.length > 0) {
        for (const email of invitedEmails) {
          try {
            // Buscar usuario existente por correo
            const { data: userData, error: userErr } = await supabase
              .from('usuarios')
              .select('id')
              .eq('email', email)
              .single();

            if (userErr) {
              console.error('Error looking up user for invite:', email, userErr);
            }

            if (userData && userData.id) {
              // Insertar asignación en user_workspaces con rol 'Cliente' y estado 'Invitado'
              try {
                await supabase.from('user_workspaces').insert({
                  user_id: userData.id,
                  workspace_id: created.id,
                  rol: 'Cliente',
                  estado: 'Invitado',
                  invited_at: new Date().toISOString(),
                  invited_by: auth.user?.id || null
                });
              } catch (err) {
                console.error('Error inserting user_workspaces for', email, err);
              }
            } else {
              // Si no existe usuario, crear registro de invitación
              try {
                await createRegisterRequest({
                  company_name: created.name,
                  contact_name: '',
                  email,
                  message: `Invitación al workspace ${created.name} (rol: Cliente)`
                });
              } catch (err) {
                console.error('Error creating invite request for', email, err);
              }
            }
          } catch (err) {
            console.error('Unexpected error processing invite for', email, err);
          }
        }
      }

      setNewWorkspace({ name: "", description: "" });
      setInvitedEmails([]);
      setInviteEmail("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const handleToggleStatus = async (workspaceId: string, currentStatus: 'Activo' | 'Inactivo') => {
    try {
      await toggleWorkspaceStatus(workspaceId, currentStatus);
    } catch (error) {
      console.error('Error toggling workspace status:', error);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await deleteWorkspace(workspaceId);
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
  };

  const handleOpenEdit = (workspace: any) => {
    setEditingWorkspace({
      id: workspace.id,
      name: workspace.name || "",
      description: workspace.description || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingWorkspace.name) return;

    try {
      await updateWorkspace(editingWorkspace.id, {
        name: editingWorkspace.name,
        description: editingWorkspace.description || null
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating workspace:', error);
    }
  };

  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [currentMembers, setCurrentMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");

  const fetchWorkspaceMembers = async (workspaceId: string) => {
    try {
      setMembersLoading(true);
      const { data, error } = await supabase
        .from('user_workspaces')
        .select(`rol, estado, user_id, usuarios (id, full_name, email)`)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      setCurrentMembers(data || []);
    } catch (err) {
      console.error('Error fetching workspace members', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleOpenMembers = async (workspace: any) => {
    setCurrentWorkspaceId(workspace.id);
    await fetchWorkspaceMembers(workspace.id);
    setIsMembersDialogOpen(true);
  };

  const handleUpdateMember = async (userId: string, rol: string, estado: string) => {
    if (!currentWorkspaceId) return;
    try {
      const { error } = await supabase
        .from('user_workspaces')
        .update({ rol, estado })
        .match({ user_id: userId, workspace_id: currentWorkspaceId });

      if (error) throw error;

      await fetchWorkspaceMembers(currentWorkspaceId);
    } catch (err) {
      console.error('Error updating member', err);
    }
  };

  const handleAddMemberByEmail = async (email: string) => {
    if (!currentWorkspaceId || !email) return;
    try {
      const { data: userData, error: userErr } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (userErr) {
        console.error('Error looking up user by email', userErr);
        return;
      }

      if (userData && userData.id) {
        const { error } = await supabase.from('user_workspaces').insert({
          user_id: userData.id,
          workspace_id: currentWorkspaceId,
          rol: 'Cliente',
          estado: 'Aceptado',
          accepted_at: new Date().toISOString(),
          accepted_by: auth.user?.id || null
        });

        if (error) throw error;

        await fetchWorkspaceMembers(currentWorkspaceId);
        setAddMemberEmail("");
      } else {
        // Fallback: crear register request si el usuario no existe
        try {
          await createRegisterRequest({
            company_name: '',
            contact_name: '',
            email,
            message: `Invitación al workspace (rol: Cliente)`
          });
        } catch (err) {
          console.error('Error creating register request for', email, err);
        }
      }
    } catch (err) {
      console.error('Error adding member by email', err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  if (loading) {
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
              <CardTitle>Gestión de Workspaces</CardTitle>
              <CardDescription>
                Administra las empresas cliente y sus configuraciones
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Workspace
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar workspaces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Última actividad</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkspaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No se encontraron workspaces
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkspaces.map((workspace) => (
                  <TableRow key={workspace.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{workspace.name}</div>
                        {workspace.description && (
                          <div className="text-sm text-muted-foreground">
                            {workspace.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          ID: {workspace.id.substring(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={workspace.estado === "Activo" ? "default" : "secondary"}>
                        {workspace.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {workspace.user_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(workspace.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(workspace.last_activity_at)}
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(workspace)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenMembers(workspace)}>
                            <Users className="mr-2 h-4 w-4" />
                            Ver miembros
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(workspace.id, workspace.estado)}>
                            <Power className="mr-2 h-4 w-4" />
                            {workspace.estado === "Activo" ? "Desactivar" : "Activar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteWorkspace(workspace.id)}
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Workspace</DialogTitle>
            <DialogDescription>
              Configura una nueva empresa cliente en el sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Workspace *</Label>
              <Input
                id="name"
                value={newWorkspace.name}
                onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                placeholder="Ej: Banco Regional S.A."
              />
            </div>

            {/* Client ID removed — space used for inviting members */}

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newWorkspace.description}
                onChange={(e) => setNewWorkspace({...newWorkspace, description: e.target.value})}
                placeholder="Descripción de la empresa..."
              />
            </div>
            <div>
              <Label htmlFor="invite">Cliente</Label>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <Input
                    id="invite"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="correo@cliente.com"
                  />

                  {/* Suggestions dropdown */}
                  {showSuggestions && inviteEmail.trim().length > 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-popover border rounded shadow mt-1 max-h-40 overflow-auto">
                      {(users || [])
                        .filter(u =>
                          u.email.toLowerCase().includes(inviteEmail.toLowerCase()) ||
                          u.full_name.toLowerCase().includes(inviteEmail.toLowerCase())
                        )
                        .slice(0, 8)
                        .map(u => (
                          <div
                            key={u.id}
                            className="px-3 py-2 hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                            onMouseDown={() => {
                              const email = u.email;
                              if (!invitedEmails.includes(email)) {
                                setInvitedEmails([...invitedEmails, email]);
                              }
                              setInviteEmail("");
                              setShowSuggestions(false);
                            }}
                          >
                            <div>
                              <div className="text-sm font-medium">{u.full_name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">Usuario</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <Button onClick={() => {
                  const email = inviteEmail.trim();
                  if (email && !invitedEmails.includes(email)) {
                    setInvitedEmails([...invitedEmails, email]);
                    setInviteEmail("");
                  }
                }}>Agregar</Button>
              </div>

              {invitedEmails.length > 0 && (
                <div className="mt-2">
                  {invitedEmails.map((e) => (
                    <div key={e} className="flex items-center justify-between bg-muted p-2 rounded mb-1">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">{e}</div>
                        <Badge variant="secondary">Cliente</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setInvitedEmails(invitedEmails.filter(x => x !== e))}>Quitar</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkspace}>
              Crear Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Workspace</DialogTitle>
            <DialogDescription>
              Modifica los datos del workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Nombre del Workspace *</Label>
              <Input
                id="edit_name"
                value={editingWorkspace.name}
                onChange={(e) => setEditingWorkspace({...editingWorkspace, name: e.target.value})}
                placeholder="Ej: Banco Regional S.A."
              />
            </div>

            {/* Client ID removed from edit dialog */}

            <div>
              <Label htmlFor="edit_description">Descripción</Label>
              <Textarea
                id="edit_description"
                value={editingWorkspace.description}
                onChange={(e) => setEditingWorkspace({...editingWorkspace, description: e.target.value})}
                placeholder="Descripción de la empresa..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-3xl w-[760px] p-6">
          <DialogHeader>
            <DialogTitle>Miembros del Workspace</DialogTitle>
            <DialogDescription>
              Asigna roles y cambia el estado de los miembros
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="correo@cliente.com"
                value={addMemberEmail}
                onChange={(e) => setAddMemberEmail(e.target.value)}
              />
              <Button onClick={() => handleAddMemberByEmail(addMemberEmail)}>Agregar</Button>
            </div>
            {membersLoading ? (
              <div className="flex items-center justify-center h-32">Cargando...</div>
            ) : (
              <div>
                {currentMembers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay miembros asignados</div>
                ) : (
                  <div className="space-y-3">
                    {currentMembers.map((m) => (
                      <div key={m.user_id} className="flex items-start gap-4 p-3 bg-muted/40 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{m.usuarios?.full_name || 'Sin nombre'}</div>
                          <div className="text-xs text-muted-foreground">{m.usuarios?.email}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <label className="text-xs text-muted-foreground mb-1">Rol (en workspace)</label>
                            <select
                              value={m.rol}
                              onChange={(e) => {
                                const newRol = e.target.value;
                                setCurrentMembers(prev => prev.map(p => p.user_id === m.user_id ? {...p, rol: newRol} : p));
                              }}
                              className="border rounded px-3 py-1 bg-background"
                            >
                              <option value="SuperAdmin">SuperAdmin</option>
                              <option value="Administrador">Administrador</option>
                              <option value="Visualizador">Visualizador</option>
                            </select>
                          </div>

                          <div className="flex flex-col">
                            <label className="text-xs text-muted-foreground mb-1">Estado (en workspace)</label>
                            <select
                              value={m.estado}
                              onChange={(e) => {
                                const newEstado = e.target.value;
                                setCurrentMembers(prev => prev.map(p => p.user_id === m.user_id ? {...p, estado: newEstado} : p));
                              }}
                              className="border rounded px-3 py-1 bg-background"
                            >
                              <option value="Invitado">Invitado</option>
                              <option value="Aceptado">Aceptado</option>
                              <option value="Activo">Activo</option>
                              <option value="Inactivo">Inactivo</option>
                            </select>
                          </div>

                          <div className="flex flex-col justify-end">
                            <Button size="sm" onClick={() => handleUpdateMember(m.user_id, m.rol, m.estado)}>Guardar</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

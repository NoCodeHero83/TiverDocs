import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Select } from '@/components/ui/select';

export const SubscriptionsManager = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ workspace_id: '', responsible_user_id: '', start_date: '', end_date: '', notes: '' });
  const { usuario } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*, workspaces (id, name)')
        .order('created_at', { ascending: false });

      // fetch assignments to display assigned users
      const { data: assigns } = await supabase
        .from('subscription_assignments')
        .select('subscription_id, usuarios (id, full_name, email)');

      // merge assigned users into subscriptions
      const subsWithUsers = (subs || []).map((s: any) => ({
        ...s,
        assigned_users: (assigns || []).filter((a: any) => a.subscription_id === s.id).map((a: any) => a.usuarios)
      }));

      const { data: ws } = await supabase.from('workspaces').select('id, name').order('name');
      const { data: us } = await supabase.from('usuarios').select('id, full_name, email').order('full_name');

      setSubscriptions(subsWithUsers || []);
      setWorkspaces(ws || []);
      setUsers(us || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      const { data: created, error } = await supabase.from('subscriptions').insert({
        workspace_id: form.workspace_id,
        responsible_user_id: form.responsible_user_id || usuario?.id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null
      }).select().single();
      if (error) throw error;
      // assign subscription automatically to users of the workspace
      if (created && form.workspace_id) {
        try {
          const { data: uw } = await supabase.from('user_workspaces').select('user_id').eq('workspace_id', form.workspace_id);
          const userIds = (uw || []).map((r: any) => r.user_id);
          if (userIds.length > 0) {
            const assignments = userIds.map((uid: string) => ({
              subscription_id: created.id,
              user_id: uid,
              status: 'assigned'
            }));
            const { error: assignError } = await supabase.from('subscription_assignments').insert(assignments);
            if (assignError) console.error('assignment error', assignError);
          }
        } catch (e) {
          console.error('error assigning workspace users', e);
        }
      }

      setIsCreateOpen(false);
      setForm({ workspace_id: '', responsible_user_id: usuario?.id || '', start_date: '', end_date: '', notes: '' });
      await fetchData();
    } catch (err) {
      console.error('create subscription', err);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suscripciones</CardTitle>
              <CardDescription>Gestiona las suscripciones por cliente</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>Nueva suscripción</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Usuarios asignados</TableHead>
                <TableHead>Fecha inicio</TableHead>
                <TableHead>Fecha fin</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5}>Cargando...</TableCell></TableRow>
              ) : (
                subscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.workspaces?.name}</TableCell>
                    <TableCell>
                      {(s.assigned_users || []).length === 0 ? '-' : (
                        <div className="flex flex-col">
                          {(s.assigned_users || []).map((u: any) => (
                            <div key={u.id} className="text-sm">{u.full_name} <span className="text-xs text-muted-foreground">{u.email}</span></div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{s.start_date || '-'}</TableCell>
                    <TableCell>{s.end_date || '-'}</TableCell>
                    <TableCell>{s.notes || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Suscripción</DialogTitle>
            <DialogDescription>Agrega una nueva suscripción</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <select value={form.workspace_id} onChange={(e) => setForm({...form, workspace_id: e.target.value})} className="w-full border rounded px-3 py-2">
                <option value="">-- Seleccionar --</option>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Responsable (creador)</Label>
              <Input value={usuario?.full_name ? `${usuario.full_name} — ${usuario.email}` : (usuario?.email || '')} disabled />
              <p className="text-xs text-muted-foreground mt-1">El responsable será el usuario que crea la suscripción</p>
            </div>

            <div>
              <Label>Usuarios asignados</Label>
              <p className="text-sm">La suscripción se asignará automáticamente a los usuarios pertenecientes al cliente (workspace).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionsManager;

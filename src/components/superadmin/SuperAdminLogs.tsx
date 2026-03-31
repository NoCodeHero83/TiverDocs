import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ActivityRow {
  id: number;
  accion: string;
  entidad_tipo: string | null;
  entidad_nombre: string | null;
  entidad_id: string | null;
  fecha: string;
  usuario_nombre?: string;
  metadata?: Record<string, any> | null;
}

export const SuperAdminLogs = () => {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entidadTypeFilter, setEntidadTypeFilter] = useState<string | 'all'>('all');
  const [usuarioFilter, setUsuarioFilter] = useState<string | 'all'>('all');
  /** Req 13: filtro por ID de documento para trazabilidad completa */
  const [entidadIdFilter, setEntidadIdFilter] = useState<string>('');
  const [debouncedEntidadId, setDebouncedEntidadId] = useState<string>('');
  const [entidadTypes, setEntidadTypes] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; full_name: string }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const qEntidad = entidadTypeFilter && entidadTypeFilter !== 'all';
      const qUsuario = usuarioFilter && usuarioFilter !== 'all';
      const hasSearch = !!debouncedSearch?.trim();
      const searchTerm = (debouncedSearch || "").trim();
      // Req 13: filtro por entidad_id (ID de documento)
      const hasEntidadId = !!debouncedEntidadId?.trim();
      const entidadIdTerm = (debouncedEntidadId || "").trim();

      // get total count with filters + search
      let countQuery: any = supabase.from('actividad_reciente').select('id', { count: 'exact', head: true });
      if (qEntidad) countQuery = countQuery.eq('entidad_tipo', entidadTypeFilter);
      if (qUsuario) countQuery = countQuery.eq('usuario_id', usuarioFilter);
      if (hasEntidadId) countQuery = countQuery.ilike('entidad_id::text', `%${entidadIdTerm}%`);
      if (hasSearch) {
        const escaped = searchTerm.replace(/%/g, '\\%');
        const orStr = `accion.ilike.%${escaped}%,entidad_nombre.ilike.%${escaped}%`;
        countQuery = countQuery.or(orStr);
      }
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      setTotal(count || 0);

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      let dataQuery: any = supabase
        .from('actividad_reciente')
        .select(`id, accion, entidad_tipo, entidad_nombre, entidad_id, fecha, usuario_id, metadata`)
        .order('fecha', { ascending: false })
        .range(start, end);

      if (qEntidad) dataQuery = dataQuery.eq('entidad_tipo', entidadTypeFilter);
      if (qUsuario) dataQuery = dataQuery.eq('usuario_id', usuarioFilter);
      if (hasEntidadId) dataQuery = dataQuery.ilike('entidad_id::text', `%${entidadIdTerm}%`);
      if (hasSearch) {
        const escaped = searchTerm.replace(/%/g, '\\%');
        const orStr = `accion.ilike.%${escaped}%,entidad_nombre.ilike.%${escaped}%`;
        dataQuery = dataQuery.or(orStr);
      }

      const { data, error } = await dataQuery;

      if (error) throw error;

      // fetch all user names in a single query to avoid N requests
      const userIds = Array.from(new Set((data || []).map((r: any) => r.usuario_id).filter(Boolean)));
      let usersMap = new Map<string, string>();
      if (userIds.length) {
        const { data: usersData } = await supabase.from('usuarios').select('id, full_name').in('id', userIds as any);
        (usersData || []).forEach((u: any) => usersMap.set(u.id, u.full_name));
      }

      const withUsers = (data || []).map((r: any) => ({
        ...r,
        usuario_nombre: r.usuario_id ? usersMap.get(r.usuario_id) || 'Usuario desconocido' : 'Sistema'
      }));

      setRows(withUsers as ActivityRow[]);
    } catch (err) {
      console.error('[SuperAdminLogs] fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const { data: tipos } = await supabase
        .from('actividad_reciente')
        .select('entidad_tipo')
        .neq('entidad_tipo', null)
        .order('entidad_tipo', { ascending: true });

      const uniq = Array.from(new Set((tipos || []).map((t: any) => t.entidad_tipo))).filter(Boolean);
      setEntidadTypes(uniq as string[]);

      const { data: users } = await supabase.from('usuarios').select('id, full_name').order('full_name', { ascending: true });
      setUsuarios(users || []);
    } catch (e) {
      console.error('[SuperAdminLogs] fetchFilters error', e);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, entidadTypeFilter, usuarioFilter, debouncedSearch, debouncedEntidadId]);

  useEffect(() => {
    setPage(1);
  }, [entidadTypeFilter, usuarioFilter, debouncedEntidadId]);

  // Debounce para el filtro de entidad_id
  useEffect(() => {
    const t = setTimeout(() => setDebouncedEntidadId(entidadIdFilter), 500);
    return () => clearTimeout(t);
  }, [entidadIdFilter]);

  // debounce search input to avoid spamming server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const channel = supabase
      .channel('actividad_reciente_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actividad_reciente' }, () => fetchLogs())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // server-side filtering is used; `rows` already reflects filters/search

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Registros del Sistema</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-52">
                <Input placeholder="Buscar texto..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {/* Req 13: filtro por ID de documento para trazabilidad */}
              <div className="w-52">
                <Input
                  placeholder="ID de documento (trazabilidad)"
                  value={entidadIdFilter}
                  onChange={e => setEntidadIdFilter(e.target.value)}
                  title="Buscar todos los eventos de un documento específico (Req 13)"
                />
              </div>

              <div>
                <Select value={entidadTypeFilter} onValueChange={(v) => setEntidadTypeFilter(v as any)}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Tipo de entidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {entidadTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={usuarioFilter} onValueChange={(v) => setUsuarioFilter(v as any)}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {usuarios.map(u => (<SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando registros...</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="max-w-[140px]">ID Entidad</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>User-Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{formatDistanceToNow(new Date(row.fecha), { addSuffix: true, locale: es })}</TableCell>
                      <TableCell className="max-w-sm truncate">{row.accion}</TableCell>
                      <TableCell>{row.entidad_tipo || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.entidad_nombre || '-'}</TableCell>
                      <TableCell className="max-w-[140px]">
                        {row.entidad_id ? (
                          <span
                            className="font-mono text-xs cursor-pointer hover:text-primary"
                            title={row.entidad_id}
                            onClick={() => setEntidadIdFilter(row.entidad_id!)}
                          >
                            {row.entidad_id.substring(0, 8)}…
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{row.usuario_nombre}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={(row.metadata as any)?._audit?.user_agent || ''}>
                        {(row.metadata as any)?._audit?.user_agent
                          ? (row.metadata as any)._audit.user_agent.split(' ').slice(0, 3).join(' ')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">Mostrando página {page} de {Math.max(1, Math.ceil((total||0) / pageSize))} — {total} registros</div>
                <nav className="inline-flex items-center gap-2 bg-surface/50 px-3 py-2 rounded-full" aria-label="Pagination">
                  {/** Render Previous */}
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`w-9 h-9 flex items-center justify-center rounded-full ${page <= 1 ? 'opacity-50 cursor-not-allowed bg-muted/20' : 'bg-primary/5 hover:shadow-md'}`}
                    aria-label="Previous"
                  >
                    ‹
                  </button>

                  {/** Numeric pages with ellipsis */}
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
                    const pages: Array<number | string> = [];

                    const push = (v: number | string) => { if (pages[pages.length - 1] !== v) pages.push(v); };

                    // Always show first
                    push(1);

                    if (page > 4) push('...');

                    // show window around current
                    for (let i = page - 2; i <= page + 2; i++) {
                      if (i > 1 && i < totalPages) push(i);
                    }

                    if (page < totalPages - 3) push('...');

                    if (totalPages > 1) push(totalPages);

                    return pages.map((pItem, idx) => {
                      if (pItem === '...') {
                        return (
                          <span key={`e-${idx}`} className="px-2 text-sm text-muted-foreground">…</span>
                        );
                      }

                      const pNum = Number(pItem);
                      const isCurrent = pNum === page;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setPage(pNum)}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={`px-3 py-1 min-w-[2rem] flex items-center justify-center text-sm rounded-md ${isCurrent ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card hover:bg-card/90'}`}
                        >
                          {pNum}
                        </button>
                      );
                    });
                  })()}

                  {/** Render Next */}
                  <button
                    onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil((total || 0) / pageSize)), p + 1))}
                    disabled={page >= Math.ceil((total || 0) / pageSize)}
                    className={`w-9 h-9 flex items-center justify-center rounded-full ${page >= Math.ceil((total || 0) / pageSize) ? 'opacity-50 cursor-not-allowed bg-muted/20' : 'bg-primary/5 hover:shadow-md'}`}
                    aria-label="Next"
                  >
                    ›
                  </button>
                </nav>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

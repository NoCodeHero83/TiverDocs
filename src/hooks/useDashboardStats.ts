import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalWorkspaces: number;
  activeWorkspaces: number;
  totalUsers: number;
  totalDocuments: number;
  expiredDocuments: number;
  expiringThisMonth: number;
  totalValue: number;
  monthlyGrowth: number;
  loading: boolean;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkspaces: 0,
    activeWorkspaces: 0,
    totalUsers: 0,
    totalDocuments: 0,
    expiredDocuments: 0,
    expiringThisMonth: 0,
    totalValue: 0,
    monthlyGrowth: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [
          workspacesResult,
          usersResult,
          documentsResult,
          expiredDocsResult,
          expiringThisMonthResult,
          totalValueResult,
          currentMonthDocsResult,
          lastMonthDocsResult,
        ] = await Promise.all([
          supabase.from('workspaces').select('id, estado', { count: 'exact' }),
          supabase.from('usuarios').select('id', { count: 'exact' }),
          supabase.from('documentos').select('id', { count: 'exact' }),
          supabase
            .from('documentos')
            .select('id', { count: 'exact' })
            .not('fecha_vencimiento', 'is', null)
            .lt('fecha_vencimiento', now.toISOString()),
          supabase
            .from('documentos')
            .select('id', { count: 'exact' })
            .not('fecha_vencimiento', 'is', null)
            .gte('fecha_vencimiento', firstDayOfMonth.toISOString())
            .lte('fecha_vencimiento', lastDayOfMonth.toISOString()),
          supabase
            .from('documentos')
            .select('valor_titulo'),
          supabase
            .from('documentos')
            .select('id', { count: 'exact' })
            .gte('created_at', firstDayOfMonth.toISOString())
            .lte('created_at', lastDayOfMonth.toISOString()),
          supabase
            .from('documentos')
            .select('id', { count: 'exact' })
            .gte('created_at', firstDayOfLastMonth.toISOString())
            .lte('created_at', lastDayOfLastMonth.toISOString()),
        ]);

        const totalWorkspaces = workspacesResult.count || 0;
        const activeWorkspaces = workspacesResult.data?.filter(w => w.estado === 'Activo').length || 0;
        const totalUsers = usersResult.count || 0;
        const totalDocuments = documentsResult.count || 0;
        const expiredDocuments = expiredDocsResult.count || 0;
        const expiringThisMonth = expiringThisMonthResult.count || 0;

        const totalValue = totalValueResult.data?.reduce(
          (sum, doc) => sum + (Number(doc.valor_titulo) || 0),
          0
        ) || 0;

        const currentMonthDocs = currentMonthDocsResult.count || 0;
        const lastMonthDocs = lastMonthDocsResult.count || 0;
        const monthlyGrowth = lastMonthDocs > 0
          ? ((currentMonthDocs - lastMonthDocs) / lastMonthDocs) * 100
          : 0;

        setStats({
          totalWorkspaces,
          activeWorkspaces,
          totalUsers,
          totalDocuments,
          expiredDocuments,
          expiringThisMonth,
          totalValue,
          monthlyGrowth,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};

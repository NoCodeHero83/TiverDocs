import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface WorkspaceStats {
  workspace: string;
  documents: number;
  users: number;
  growth: number;
  value: number;
}

interface BusinessMetrics {
  monthlyGrowth: number;
  newWorkspaces: number;
  newUsers: number;
  processingVolume: number;
}

interface SystemStats {
  workspaceStats: WorkspaceStats[];
  businessMetrics: BusinessMetrics;
  loading: boolean;
}

export const useSystemStats = () => {
  const [stats, setStats] = useState<SystemStats>({
    workspaceStats: [],
    businessMetrics: {
      monthlyGrowth: 0,
      newWorkspaces: 0,
      newUsers: 0,
      processingVolume: 0,
    },
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [workspacesData, newWorkspacesResult, newUsersResult, totalValueResult] = await Promise.all([
          supabase
            .from('workspaces')
            .select(`
              id,
              name,
              user_count,
              created_at
            `)
            .eq('estado', 'Activo'),
          supabase
            .from('workspaces')
            .select('id', { count: 'exact' })
            .gte('created_at', firstDayOfMonth.toISOString()),
          supabase
            .from('usuarios')
            .select('id', { count: 'exact' })
            .gte('created_at', firstDayOfMonth.toISOString()),
          supabase
            .from('documentos')
            .select('valor_titulo'),
        ]);

        const workspaceStatsPromises = (workspacesData.data || []).map(async (workspace) => {
          const [docsResult, docsValueResult, currentMonthDocs, lastMonthDocs] = await Promise.all([
            supabase
              .from('documentos')
              .select('id', { count: 'exact' })
              .eq('workspace_id', workspace.id),
            supabase
              .from('documentos')
              .select('valor_titulo')
              .eq('workspace_id', workspace.id),
            supabase
              .from('documentos')
              .select('id', { count: 'exact' })
              .eq('workspace_id', workspace.id)
              .gte('created_at', firstDayOfMonth.toISOString()),
            supabase
              .from('documentos')
              .select('id', { count: 'exact' })
              .eq('workspace_id', workspace.id)
              .gte('created_at', firstDayOfLastMonth.toISOString())
              .lte('created_at', lastDayOfLastMonth.toISOString()),
          ]);

          const documents = docsResult.count || 0;
          const value = docsValueResult.data?.reduce(
            (sum, doc) => sum + (Number(doc.valor_titulo) || 0),
            0
          ) || 0;

          const currentDocs = currentMonthDocs.count || 0;
          const lastDocs = lastMonthDocs.count || 0;
          const growth = lastDocs > 0 ? ((currentDocs - lastDocs) / lastDocs) * 100 : 0;

          return {
            workspace: workspace.name,
            documents,
            users: workspace.user_count,
            growth: parseFloat(growth.toFixed(1)),
            value,
          };
        });

        const workspaceStats = await Promise.all(workspaceStatsPromises);
        workspaceStats.sort((a, b) => b.documents - a.documents);

        const processingVolume = totalValueResult.data?.reduce(
          (sum, doc) => sum + (Number(doc.valor_titulo) || 0),
          0
        ) || 0;

        const [currentMonthAllDocs, lastMonthAllDocs] = await Promise.all([
          supabase
            .from('documentos')
            .select('id', { count: 'exact' })
            .gte('created_at', firstDayOfMonth.toISOString()),
          supabase
            .from('documentos')
            .select('id', { count: 'exact' })
            .gte('created_at', firstDayOfLastMonth.toISOString())
            .lte('created_at', lastDayOfLastMonth.toISOString()),
        ]);

        const currentDocs = currentMonthAllDocs.count || 0;
        const lastDocs = lastMonthAllDocs.count || 0;
        const monthlyGrowth = lastDocs > 0 ? ((currentDocs - lastDocs) / lastDocs) * 100 : 0;

        setStats({
          workspaceStats: workspaceStats.slice(0, 5),
          businessMetrics: {
            monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
            newWorkspaces: newWorkspacesResult.count || 0,
            newUsers: newUsersResult.count || 0,
            processingVolume,
          },
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching system stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};

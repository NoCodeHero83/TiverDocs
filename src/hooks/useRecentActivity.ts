import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface RecentActivity {
  id: number;
  accion: string;
  entidad_tipo: string | null;
  entidad_nombre: string | null;
  fecha: string;
  usuario_nombre?: string;
}

export const useRecentActivity = (limit: number = 10) => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('actividad_reciente')
          .select(`
            id,
            accion,
            entidad_tipo,
            entidad_nombre,
            fecha,
            usuario_id
          `)
          .order('fecha', { ascending: false })
          .limit(limit);

        if (error) throw error;

        const activitiesWithUsers = await Promise.all(
          (data || []).map(async (activity) => {
            if (activity.usuario_id) {
              const { data: userData } = await supabase
                .from('usuarios')
                .select('full_name')
                .eq('id', activity.usuario_id)
                .maybeSingle();

              return {
                ...activity,
                usuario_nombre: userData?.full_name || 'Usuario desconocido'
              };
            }
            return {
              ...activity,
              usuario_nombre: 'Sistema'
            };
          })
        );

        setActivities(activitiesWithUsers);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    const channel = supabase
      .channel('actividad_reciente_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'actividad_reciente'
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { activities, loading };
};

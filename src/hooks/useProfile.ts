import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
          } else {
            setProfile(data);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Use setTimeout to defer the fetch and avoid potential recursion
        setTimeout(() => {
          fetchProfile();
        }, 0);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Don't refetch on token refresh to avoid unnecessary calls
        return;
      }
    });

    // Initial fetch
    fetchProfile();

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isUser = profile?.role === 'user';

  return {
    profile,
    loading,
    isAdmin,
    isUser,
  };
}
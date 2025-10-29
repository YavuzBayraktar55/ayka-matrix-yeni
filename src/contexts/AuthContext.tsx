'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PersonelInfo, BolgeInfo, UserRole } from '@/types/database';

interface User {
  PersonelTcKimlik: number;
  PersonelEmail: string;
  PersonelRole: UserRole;
  PersonelAktif: boolean;
  BolgeID: number | null;
  PersonelInfo?: PersonelInfo;
  BolgeInfo?: BolgeInfo;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const loadingRef = useRef(false); // Prevent duplicate loads

  const loadUserData = useCallback(async (email: string) => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      return;
    }
    
    loadingRef.current = true;
    
    try {
      const supabase = supabaseRef.current;
      
      // PersonelLevelizasyon'dan kullanıcı bilgilerini al
      const { data, error } = await supabase
        .from('PersonelLevelizasyon')
        .select(`
          PersonelTcKimlik,
          PersonelEmail,
          PersonelRole,
          PersonelAktif,
          BolgeID
        `)
        .eq('PersonelEmail', email)
        .eq('PersonelAktif', true)
        .single();

      if (error || !data) {
        console.error('❌ PersonelLevelizasyon verisi yüklenemedi:', error);
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Personel bilgilerini al
      const { data: personelInfo } = await supabase
        .from('PersonelInfo')
        .select('*')
        .eq('PersonelTcKimlik', data.PersonelTcKimlik)
        .single();

      // Bölge bilgilerini al
      let bolgeInfo = undefined;
      if (data.BolgeID) {
        const { data: bolge } = await supabase
          .from('BolgeInfo')
          .select('*')
          .eq('BolgeID', data.BolgeID)
          .single();
        
        bolgeInfo = bolge || undefined;
      }

      const userData: User = {
        PersonelTcKimlik: data.PersonelTcKimlik,
        PersonelEmail: data.PersonelEmail,
        PersonelRole: data.PersonelRole as UserRole,
        PersonelAktif: data.PersonelAktif,
        BolgeID: data.BolgeID,
        PersonelInfo: personelInfo || undefined,
        BolgeInfo: bolgeInfo,
      };

      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Kullanıcı verisi yükleme hatası:', error);
      await supabaseRef.current.auth.signOut();
      setUser(null);
      setLoading(false);
    } finally {
      loadingRef.current = false;
    }
  }, []); // No dependencies - stable function

  useEffect(() => {
    const supabase = supabaseRef.current;
    
    // Supabase auth session'ı kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user.email!);
      } else {
        setLoading(false);
      }
    });

    // Auth değişikliklerini dinle - sadece SIGNED_IN ve SIGNED_OUT eventlerinde user data yükle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Sadece gerçek auth değişikliklerinde işlem yap
      if (event === 'SIGNED_IN' && session?.user) {
        loadUserData(session.user.email!);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        loadingRef.current = false;
      }
      // TOKEN_REFRESHED, USER_UPDATED gibi diğer eventleri ignore et
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]); // Only loadUserData dependency

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = supabaseRef.current;
      
      // Supabase Auth ile giriş yap
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.error('❌ Auth hatası:', authError);
        return { success: false, error: 'E-posta veya şifre hatalı' };
      }

      // Kullanıcı verilerini yükle
      await loadUserData(email);

      // User state'inin set edilmesi için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 100));

      return { success: true };
    } catch (error) {
      console.error('❌ Giriş hatası:', error);
      return { success: false, error: 'Bir hata oluştu' };
    }
  };

  const signOut = async () => {
    await supabaseRef.current.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

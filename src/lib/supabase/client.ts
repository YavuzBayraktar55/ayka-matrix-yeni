import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance - sadece bir kez oluşturulur
let supabaseInstance: SupabaseClient | null = null;

export function createClient() {
  // Eğer instance zaten varsa, onu döndür
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // İlk kez oluşturuluyorsa, instance'ı cache'le
  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'implicit'
      }
    }
  );

  return supabaseInstance;
}

// Her query öncesi RLS context'ini set eden helper fonksiyon
export async function setRLSContext() {
  if (typeof window === 'undefined') return;
  
  try {
    const storedUser = localStorage.getItem('ayka_user');
    if (!storedUser) return;
    
    const user = JSON.parse(storedUser);
    const supabase = createClient();
    
    // PostgreSQL RLS fonksiyonları için JWT claims set et
    await supabase.rpc('set_request_claims', {
      p_tc_kimlik: user.PersonelTcKimlik,
      p_user_role: user.PersonelRole,
      p_bolge_id: user.BolgeID || 0
    });
  } catch (error) {
    // Context set edilemezse sessizce devam et
    console.warn('RLS context set hatası:', error);
  }
}



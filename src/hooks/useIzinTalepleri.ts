import useSWR from 'swr';
import { IzinTalepleri } from '@/types/database';

interface FullIzinTalep extends IzinTalepleri {
  PersonelInfo?: {
    P_AdSoyad: string;
  };
  BolgeInfo?: {
    BolgeAdi: string;
  };
}

const fetcher = async (url: string): Promise<FullIzinTalep[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch izin talepleri');
  return res.json();
};

interface UseIzinTalepleriOptions {
  userEmail: string;
  userRole: string;
  enabled?: boolean;
}

export function useIzinTalepleri({ userEmail, userRole, enabled = true }: UseIzinTalepleriOptions) {
  const shouldFetch = enabled && userEmail && userRole;
  
  const { data, error, isLoading, mutate } = useSWR<FullIzinTalep[]>(
    shouldFetch ? `/api/izin-talepleri?userEmail=${encodeURIComponent(userEmail)}&userRole=${encodeURIComponent(userRole)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    talepler: data || [],
    isLoading: shouldFetch ? isLoading : false,
    isError: error,
    mutate,
  };
}

interface UseIzinGecmisOptions {
  talepId: number | null;
  enabled?: boolean;
}

const gecmisFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch izin gecmis');
  return res.json();
};

export function useIzinGecmis({ talepId, enabled = true }: UseIzinGecmisOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled && talepId ? `/api/izin-gecmis?talepId=${talepId}` : null,
    gecmisFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Geçmiş için daha kısa cache
      errorRetryCount: 2,
    }
  );

  return {
    gecmis: data?.data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

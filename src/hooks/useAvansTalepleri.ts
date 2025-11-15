import useSWR from 'swr';
import { AvansTalepleri } from '@/types/database';

interface FullAvansTalep extends AvansTalepleri {
  PersonelInfo?: {
    P_AdSoyad: string;
  };
  BolgeInfo?: {
    BolgeAdi: string;
  };
}

interface UseAvansTalepleriParams {
  userEmail: string;
  userRole: string;
  enabled?: boolean;
}

const fetcher = async (url: string): Promise<FullAvansTalep[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch avans talepleri');
  return res.json();
};

export function useAvansTalepleri({ userEmail, userRole, enabled = true }: UseAvansTalepleriParams) {
  const shouldFetch = enabled && userEmail && userRole;
  
  const { data, error, mutate, isLoading } = useSWR<FullAvansTalep[]>(
    shouldFetch ? `/api/avans-talepleri?userEmail=${encodeURIComponent(userEmail)}&userRole=${encodeURIComponent(userRole)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 saniye içinde aynı isteği tekrar etme
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

import useSWR from 'swr';

// Fetcher function
const fetcher = (url: string) => fetch(url).then(r => r.json());

interface UsePersonellerOptions {
  userEmail: string;
  userRole: string;
  enabled?: boolean; // Conditional fetching için
}

export function usePersoneller({ userEmail, userRole, enabled = true }: UsePersonellerOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled && userEmail && userRole 
      ? `/api/personel?userEmail=${encodeURIComponent(userEmail)}&userRole=${encodeURIComponent(userRole)}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false, // Fokus aldığında otomatik yenileme yapma
      revalidateOnReconnect: true, // İnternet bağlantısı geri gelince yenile
      dedupingInterval: 10000, // 10 saniye içinde aynı key için tekrar fetch yapma
      shouldRetryOnError: true, // Hata durumunda retry yap
      errorRetryCount: 3, // Maksimum 3 kez retry
      errorRetryInterval: 5000, // 5 saniye bekle ve retry
    }
  );

  return {
    personeller: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate, // Manuel refresh için
  };
}

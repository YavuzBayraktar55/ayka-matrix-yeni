import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useBolgeler() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/bolgeler',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false, // Bölgeler çok nadir değişir
      dedupingInterval: 60000, // 1 dakika cache
      shouldRetryOnError: true,
      errorRetryCount: 3,
    }
  );

  return {
    bolgeler: data?.data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

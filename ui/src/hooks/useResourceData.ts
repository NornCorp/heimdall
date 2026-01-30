import { useQuery } from '@tanstack/react-query';

interface ResourceDataOptions {
  serviceAddress: string;
  resourceName: string;
  enabled: boolean;
}

/**
 * Hook to fetch actual data from a resource endpoint
 */
export function useResourceData({ serviceAddress, resourceName, enabled }: ResourceDataOptions) {
  return useQuery({
    queryKey: ['resource-data', serviceAddress, resourceName],
    queryFn: async () => {
      const url = `http://${serviceAddress}/${resourceName}`;
      console.log('Fetching resource data from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Resource data response:', data);

      // Handle both array and object responses
      if (Array.isArray(data)) {
        return data as Record<string, any>[];
      }

      // If it's an object with a data field, return that
      if (data && typeof data === 'object' && Array.isArray(data.data)) {
        return data.data as Record<string, any>[];
      }

      // Otherwise return empty array
      return [];
    },
    enabled,
    staleTime: 10000, // Cache for 10 seconds
    retry: 1,
  });
}

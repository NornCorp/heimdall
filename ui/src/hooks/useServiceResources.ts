import { useQuery } from '@tanstack/react-query';
import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { ObserverService } from '../gen/observer/v1/observer_pb';
import type { Service } from '../gen/observer/v1/observer_pb';

const transport = createConnectTransport({
  baseUrl: window.location.origin,
});

const client = createClient(ObserverService, transport);

/**
 * Hook to fetch resources for a specific service
 */
export function useServiceResources(service: Service | null) {
  return useQuery({
    queryKey: ['service-resources', service?.name],
    queryFn: async () => {
      if (!service) return null;

      const response = await client.getServiceResources({
        serviceName: service.name,
      });

      return response.resources;
    },
    enabled: !!service,
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  });
}

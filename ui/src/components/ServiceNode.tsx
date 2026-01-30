import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Service, ServiceStatus } from '../gen/observer/v1/observer_pb';
import { ServiceStatus as Status } from '../gen/observer/v1/observer_pb';

export type ServiceNodeData = {
  service: Service;
  [key: string]: unknown;
};

/**
 * Get status color classes based on service status
 */
function getStatusColor(status: ServiceStatus): {
  bg: string;
  border: string;
  text: string;
} {
  switch (status) {
    case Status.HEALTHY:
      return {
        bg: 'bg-norn-green/10',
        border: 'border-norn-green',
        text: 'text-norn-green',
      };
    case Status.UNHEALTHY:
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500',
        text: 'text-red-500',
      };
    case Status.UNKNOWN:
    case Status.UNSPECIFIED:
    default:
      return {
        bg: 'bg-gray-500/10',
        border: 'border-gray-500',
        text: 'text-gray-400',
      };
  }
}

/**
 * Get service type icon SVG path
 */
function getServiceTypeIcon(type: string): React.JSX.Element {
  switch (type.toLowerCase()) {
    case 'http':
    case 'https':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
        />
      );
    case 'postgres':
    case 'postgresql':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        />
      );
    case 'tcp':
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
        />
      );
    default:
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
        />
      );
  }
}

/**
 * Custom react-flow node for displaying services
 */
export const ServiceNode = memo(({ data, selected }: NodeProps) => {
  const { service } = data as ServiceNodeData;
  const colors = getStatusColor(service.status);

  return (
    <div
      className={`
        relative rounded-lg border-2 bg-norn-dark px-4 py-3 shadow-lg transition-all
        ${colors.border}
        ${colors.bg}
        ${selected ? 'ring-2 ring-norn-green ring-offset-2 ring-offset-norn-darker' : ''}
      `}
      style={{ minWidth: 200 }}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-gray-600 !bg-gray-800"
      />

      {/* Node content */}
      <div className="flex items-start gap-3">
        {/* Service type icon */}
        <div className={`flex-shrink-0 ${colors.text}`}>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            {getServiceTypeIcon(service.type)}
          </svg>
        </div>

        {/* Service info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{service.name}</h3>
            <span
              className={`
                inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                ${colors.bg} ${colors.text} ring-1 ring-inset ${colors.border}
              `}
            >
              {service.type}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400 truncate">{service.address}</p>
          {service.upstreams.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {service.upstreams.length} upstream{service.upstreams.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-gray-600 !bg-gray-800"
      />
    </div>
  );
});

ServiceNode.displayName = 'ServiceNode';

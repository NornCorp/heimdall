import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import { ServiceNode, type ServiceNodeData } from './ServiceNode';
import type { Service } from '../gen/observer/v1/observer_pb';

const elk = new ELK();

// ELK layout options for automatic graph layout
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '80',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
};

interface TopologyGraphProps {
  services: Service[];
  onServiceClick?: (service: Service) => void;
}

/**
 * Convert services to react-flow nodes and edges
 */
function servicesToGraph(services: Service[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = services.map((service) => ({
    id: service.name,
    type: 'service',
    data: { service },
    position: { x: 0, y: 0 }, // Will be set by layout
  }));

  const edges: Edge[] = [];
  for (const service of services) {
    for (const upstream of service.upstreams) {
      // Create edge from this service to upstream
      edges.push({
        id: `${service.name}-${upstream}`,
        source: service.name,
        target: upstream,
        animated: true,
        style: { stroke: '#6B8F7A' },
      });
    }
  }

  return { nodes, edges };
}

/**
 * Apply ELK automatic layout to nodes
 */
async function applyAutoLayout(
  nodes: Node[],
  edges: Edge[]
): Promise<Node[]> {
  // Convert to ELK graph format
  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: 240, // Approximate node width
      height: 80, // Approximate node height
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  // Run layout algorithm
  const layoutedGraph = await elk.layout(elkGraph);

  // Apply positions to nodes
  return nodes.map((node) => {
    const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x ?? 0,
        y: elkNode?.y ?? 0,
      },
    };
  });
}

/**
 * Topology visualization component using react-flow
 */
export function TopologyGraph({ services, onServiceClick }: TopologyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLayouting, setIsLayouting] = useState(false);

  // Custom node types
  const nodeTypes = useMemo(() => ({ service: ServiceNode }), []);

  // Update graph when services change
  useEffect(() => {
    if (services.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    async function updateGraph() {
      setIsLayouting(true);
      const { nodes: newNodes, edges: newEdges } = servicesToGraph(services);
      const layoutedNodes = await applyAutoLayout(newNodes, newEdges);
      setNodes(layoutedNodes);
      setEdges(newEdges);
      setIsLayouting(false);
    }

    updateGraph();
  }, [services, setNodes, setEdges]);

  // Handle node clicks
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const nodeData = node.data as ServiceNodeData;
      if (onServiceClick && nodeData.service) {
        onServiceClick(nodeData.service);
      }
    },
    [onServiceClick]
  );

  if (services.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-300">No services</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start Loki services to see them appear in the topology graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isLayouting && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg bg-norn-dark/90 px-4 py-2 text-sm text-gray-300 shadow-lg">
          Calculating layout...
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-norn-darker"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1D5E3B" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const service = (node.data as ServiceNodeData).service;
            // Color based on status
            switch (service.status) {
              case 1: // HEALTHY
                return '#38BA73';
              case 2: // UNHEALTHY
                return '#EF4444';
              default:
                return '#6B7280';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}

"use client";

import { useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  NodeTypes,
  EdgeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Crown, Trash2, Circle, Zap } from "lucide-react";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "../../../backend/routers";

// ✅ Properly typed interfaces using TRPC inference
interface ConnectionGraphProps {
  users: inferProcedureOutput<AppRouter["user"]["getAllUsers"]>;
  connections: inferProcedureOutput<AppRouter["connection"]["getConnections"]>;
  microCircles: inferProcedureOutput<
    AppRouter["microCircle"]["getMicroCircles"]
  >;
  hostUser: inferProcedureOutput<AppRouter["auth"]["getCurrentUser"]>;
  selectedUsers: string[];
  onUserSelect: (userId: string, isSelected: boolean) => void;
  onConnectionDelete: (connectionId: string) => void;
  isLoading: boolean;
}

// Type aliases for cleaner code
type UserType = inferProcedureOutput<
  AppRouter["user"]["getAllUsers"]
>["users"][number];
type ConnectionType = inferProcedureOutput<
  AppRouter["connection"]["getConnections"]
>["connections"][number];
type MicroCircleType = inferProcedureOutput<
  AppRouter["microCircle"]["getMicroCircles"]
>["circles"][number];

// Custom User Node Component
const UserNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const { user, onSelect, isSelected, isHost, microCircle } = data;

  return (
    <div
      className={`
        relative min-w-[200px] p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 bg-white
        ${
          isSelected
            ? "border-blue-500 shadow-lg scale-105"
            : selected
            ? "border-green-500 shadow-md scale-102"
            : "border-gray-300 hover:border-gray-400 hover:scale-102"
        }
        ${microCircle ? "shadow-md" : ""}
      `}
      onClick={() => onSelect(user._id, !isSelected)}
      style={
        microCircle
          ? {
              backgroundColor: `${microCircle.color}10`,
              borderColor: microCircle.color,
            }
          : {}
      }
    >
      <div className="flex items-center gap-3">
        {/* Profile Picture */}
        <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
          <AvatarImage src={user.profileImage} alt={user.username} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
            {user.username?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {user.username}
            </h3>
            {isHost && <Crown className="h-4 w-4 text-orange-500" />}
          </div>
          <p className="text-xs text-gray-600 truncate">{user.email}</p>

          {/* Role Badge */}
          <Badge
            variant="outline"
            className={`text-xs mt-1 ${
              isHost
                ? "bg-orange-100 text-orange-800 border-orange-300"
                : "bg-blue-100 text-blue-800 border-blue-300"
            }`}
          >
            {user.UserRole}
          </Badge>
        </div>
      </div>

      {/* Micro Circle Label */}
      {microCircle && (
        <div
          className="absolute -top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm"
          style={{ backgroundColor: microCircle.color }}
        >
          {microCircle.name}
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
      )}
    </div>
  );
};

// Custom Connection Edge Component
const ConnectionEdge = ({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: any) => {
  const edgePath = `M ${sourceX} ${sourceY} Q ${(sourceX + targetX) / 2} ${
    (sourceY + targetY) / 2 - 50
  } ${targetX} ${targetY}`;

  // ✅ Different styling for implicit connections
  const isImplicit = data.isImplicit;

  return (
    <g>
      {/* Main edge path */}
      <path
        id={id}
        style={{
          stroke: data.microCircle?.color || "#10b981",
          strokeWidth: isImplicit ? 1 : 2, // Thinner for implicit
          strokeDasharray: isImplicit ? "5,5" : "none", // Dashed for implicit
          fill: "none",
          opacity: isImplicit ? 0.6 : 1, // More transparent for implicit
        }}
        d={edgePath}
        className={`react-flow__edge-path ${selected ? "selected" : ""}`}
      />

      {/* Delete button - only for manual connections */}
      {selected && data.onDelete && !isImplicit && (
        <foreignObject
          width={32}
          height={32}
          x={(sourceX + targetX) / 2 - 16}
          y={(sourceY + targetY) / 2 - 16}
          className="react-flow__edge-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <Button
            size="sm"
            variant="destructive"
            className="w-8 h-8 p-0 rounded-full shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(data.connectionId);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </foreignObject>
      )}

      {/* Edge label */}
      {data.microCircle?.name && (
        <foreignObject
          width={100}
          height={20}
          x={(sourceX + targetX) / 2 - 50}
          y={(sourceY + targetY) / 2 - 30}
          className="react-flow__edge-foreignobject"
        >
          <div
            className={`px-2 py-1 text-xs font-medium text-white rounded shadow-sm ${
              isImplicit ? "opacity-75" : ""
            }`}
            style={{ backgroundColor: data.microCircle.color }}
          >
            {data.microCircle.name}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

const nodeTypes: NodeTypes = {
  userNode: UserNode,
};

const edgeTypes: EdgeTypes = {
  connectionEdge: ConnectionEdge,
};

const ConnectionGraph: React.FC<ConnectionGraphProps> = ({
  users,
  connections,
  microCircles,
  hostUser,
  selectedUsers,
  onUserSelect,
  onConnectionDelete,
  isLoading,
}) => {
  const { nodes, edges } = useMemo(() => {
    // ✅ Properly typed micro circle map
    const microCircleMap = new Map<string, MicroCircleType>();

    // Create micro circle lookup
    microCircles.circles.forEach((circle) => {
      circle.members.forEach((member) => {
        microCircleMap.set(member._id, circle);
      });
    });

    // Generate nodes with micro circle positioning
    const generatedNodes: Node[] = [];
    const centerX = 400;
    const centerY = 300;

    // ✅ Fix: Check if hostUser exists before positioning
    if (hostUser) {
      generatedNodes.push({
        id: hostUser._id,
        type: "userNode",
        position: { x: centerX, y: centerY },
        data: {
          user: hostUser,
          onSelect: onUserSelect,
          isSelected: selectedUsers.includes(hostUser._id),
          isHost: true,
          microCircle: microCircleMap.get(hostUser._id),
        },
        draggable: true,
      });
    }

    // ✅ Properly typed user arrays
    const groupedUsers = new Map<string, UserType[]>();
    const ungroupedUsers: UserType[] = [];

    // ✅ Fix: Access users array correctly
    users.users.forEach((user) => {
      const circle = microCircleMap.get(user._id);
      if (circle) {
        if (!groupedUsers.has(circle._id)) {
          groupedUsers.set(circle._id, []);
        }
        groupedUsers.get(circle._id)!.push(user);
      } else {
        ungroupedUsers.push(user);
      }
    });

    // Position micro circle groups
    let groupIndex = 0;
    const totalGroups = groupedUsers.size + (ungroupedUsers.length > 0 ? 1 : 0);

    groupedUsers.forEach((groupUsers, circleId) => {
      const circle = microCircles.circles.find((c) => c._id === circleId);
      if (!circle) return;

      const groupAngle = (2 * Math.PI * groupIndex) / totalGroups;
      const groupRadius = 250;
      const groupCenterX = centerX + groupRadius * Math.cos(groupAngle);
      const groupCenterY = centerY + groupRadius * Math.sin(groupAngle);

      groupUsers.forEach((user, userIndex) => {
        const userAngle = (2 * Math.PI * userIndex) / groupUsers.length;
        const userRadius = 80;

        generatedNodes.push({
          id: user._id,
          type: "userNode",
          position: {
            x: groupCenterX + userRadius * Math.cos(userAngle),
            y: groupCenterY + userRadius * Math.sin(userAngle),
          },
          data: {
            user,
            onSelect: onUserSelect,
            isSelected: selectedUsers.includes(user._id),
            isHost: false,
            microCircle: circle,
          },
          draggable: true,
        });
      });

      groupIndex++;
    });

    // Position ungrouped users
    if (ungroupedUsers.length > 0) {
      const groupAngle = (2 * Math.PI * groupIndex) / totalGroups;
      const groupRadius = 250;
      const groupCenterX = centerX + groupRadius * Math.cos(groupAngle);
      const groupCenterY = centerY + groupRadius * Math.sin(groupAngle);

      ungroupedUsers.forEach((user, userIndex) => {
        const userAngle = (2 * Math.PI * userIndex) / ungroupedUsers.length;
        const userRadius = 80;

        generatedNodes.push({
          id: user._id,
          type: "userNode",
          position: {
            x: groupCenterX + userRadius * Math.cos(userAngle),
            y: groupCenterY + userRadius * Math.sin(userAngle),
          },
          data: {
            user,
            onSelect: onUserSelect,
            isSelected: selectedUsers.includes(user._id),
            isHost: false,
            microCircle: null,
          },
          draggable: true,
        });
      });
    }

    const generatedEdges: Edge[] = [];

    // Add manual connections (user-to-user)
    connections.connections.forEach((connection) => {
      generatedEdges.push({
        id: connection._id,
        source: connection.userA._id,
        target: connection.userB._id,
        type: "connectionEdge",
        animated: false,
        data: {
          connectionId: connection._id,
          onDelete: onConnectionDelete,
          microCircle: connection.microCircle,
        },
      });
    });

    if (hostUser) {
      users.users.forEach((user) => {
        // Skip if this user already has a manual connection with host
        const hasManualConnection = connections.connections.some(
          (conn) =>
            (conn.userA._id === hostUser._id && conn.userB._id === user._id) ||
            (conn.userA._id === user._id && conn.userB._id === hostUser._id)
        );

        if (!hasManualConnection) {
          generatedEdges.push({
            id: `host-${user._id}`, // Unique ID for implicit connections
            source: hostUser._id,
            target: user._id,
            type: "connectionEdge",
            animated: false,
            data: {
              connectionId: null, // No manual connection ID
              onDelete: null, // Can't delete implicit connections
              microCircle: {
                _id: "host-connection",
                name: "Host Link",
                color: "#f59e0b", // Orange for host connections
              },
              isImplicit: true, // Mark as implicit
            },
          });
        }
      });
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [
    users,
    connections,
    microCircles,
    hostUser,
    selectedUsers,
    onUserSelect,
    onConnectionDelete,
  ]);

  const [nodesState, setNodesState, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdgesState, onEdgesChange] = useEdgesState(edges);

  // Update states when props change
  useEffect(() => {
    setNodesState(nodes);
  }, [nodes, setNodesState]);

  useEffect(() => {
    setEdgesState(edges);
  }, [edges, setEdgesState]);

  const onConnect = useCallback((params: Connection) => {
    // Prevent direct edge creation - host controls connections via UI
    console.log(
      "Direct connection prevented - use the Connect button in dashboard"
    );
  }, []);

  // ✅ Fix: Check users array length correctly
  if (!users.users || users.users.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            No users to display
          </p>
          <p className="text-gray-400 text-sm">
            Invite some users to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full border rounded-lg overflow-hidden bg-white relative">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodesState}
          edges={edgesState}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          className="bg-gray-50"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap
            nodeColor="#3b82f6"
            nodeStrokeWidth={3}
            zoomable
            pannable
            className="bg-white border rounded"
          />
        </ReactFlow>
      </ReactFlowProvider>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Updating connections...</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <Card className="absolute top-4 right-4 p-3 shadow-lg z-40">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Crown className="h-3 w-3 text-orange-500" />
            <span>Host</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Circle className="h-3 w-3 text-blue-500" />
            <span>User</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span>Manual Connection</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-0.5 bg-orange-500 opacity-60"
              style={{ borderTop: "1px dashed #f59e0b" }}
            ></div>
            <span>Host Link</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConnectionGraph;

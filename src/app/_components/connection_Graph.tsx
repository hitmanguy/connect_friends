"use client";

import React, {
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Move,
  AlertTriangle,
  Users,
  Network,
  Link as LinkIcon,
  X,
  Unlink,
  Circle as CircleIcon,
  Search,
  Maximize,
  ChevronDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// INTERFACES
// ============================================================================

interface User {
  _id: string;
  username: string;
  email?: string;
  profileImage?: string;
  microCircles?: Array<{ id: string; name: string; color: string }>;
}

interface Connection {
  _id: string;
  userA: User;
  userB: User;
  notes?: string;
  createdAt?: string;
}

interface HubCircleGraphProps {
  host: User;
  users: User[];
  connections: Connection[];
  microCircles?: Array<{
    _id: string;
    name: string;
    color: string;
    members: User[];
  }>;
  width?: number;
  height?: number;
  onCreateConnection?: (userAId: string, userBId: string) => void;
  onDeleteConnection?: (connectionId: string) => void;
  onCreateMultipleConnections?: (
    connections: Array<{
      userAId: string;
      userBId: string;
      notes?: string;
    }>
  ) => void;
  onDeleteMultipleConnections?: (connectionIds: string[]) => void;
}

const GRAPH_CONFIG = {
  HUB_SIZE: { w: 280, h: 120 },
  SPOKE_SIZE: { w: 220, h: 80 },
  CIRCLE_SIZE: { w: 140, h: 50 },
  CONNECTION_LABEL_SIZE: { w: 120, h: 36 },
  CONNECTION_LINE_WIDTH: 5,
  COLORS: {
    HUB_FILL: "#f59e0b",
    HUB_STROKE: "#d97706",
    SPOKE_FILL: "#ffffff",
    SPOKE_STROKE: "#e2e8f0",
    SPOKE_HOVER: "#3b82f6",
    SPOKE_SELECTED: "#2563eb",
    SEARCH_HIGHLIGHT: "#ef4444",
    HUB_SPOKE_LINE: "#fbbf24",
    CONNECTION_LINE: "#6366f1",
    CONNECTION_HIGHLIGHT: "#4338ca",
    CIRCLE_NODE_STROKE: "#ffffff",
    CIRCLE_CONNECTION_LINE: "#8b5cf6",
    CIRCLE_GROUP_COLORS: [
      "#6366f1", // indigo
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#10b981", // emerald
      "#f97316", // orange
      "#ef4444", // red
      "#84cc16", // lime
      "#0ea5e9", // sky
      "#14b8a6", // teal
      "#f43f5e", // rose
    ],
    BACKGROUND: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  },
  LAYER: {
    BACKGROUND: 1,
    CIRCLE_GROUPS: 2,
    HUB_SPOKE_LINES: 3,
    CONNECTION_LINES: 4,
    CONNECTION_LABELS: 5,
    USER_NODES: 6,
    CONTROLS: 7,
  },
  MOBILE: {
    BREAKPOINT: 768,
    SCALE_FACTOR: 0.7,
    TOUCH_TARGET_MIN: 44,
  },
};

// ============================================================================
// UTILITY CLASSES
// ============================================================================

class ConnectionAnalyzer {
  static analyzeConnections(users: User[], connections: Connection[]) {
    const directConnectionMap = new Map<string, Set<string>>();
    const connectionDetailMap = new Map<string, Map<string, Connection>>();
    const userMap = new Map<string, User>();

    users.forEach((user) => {
      userMap.set(user._id, user);
      directConnectionMap.set(user._id, new Set<string>());
      connectionDetailMap.set(user._id, new Map<string, Connection>());
    });

    connections.forEach((conn) => {
      const userAId = conn.userA._id;
      const userBId = conn.userB._id;

      if (directConnectionMap.has(userAId)) {
        directConnectionMap.get(userAId)!.add(userBId);
        connectionDetailMap.get(userAId)!.set(userBId, conn);
      }

      if (directConnectionMap.has(userBId)) {
        directConnectionMap.get(userBId)!.add(userAId);
        connectionDetailMap.get(userBId)!.set(userAId, conn);
      }
    });

    const circleData = this.detectCircleGroups(users, directConnectionMap);

    return {
      directConnectionMap,
      connectionDetailMap,
      userMap,
      circles: circleData.circles,
      assignedCircleConnections: circleData.assignedCircleConnections,
    };
  }

  static detectCircleGroups(
    users: User[],
    connectionMap: Map<string, Set<string>>
  ) {
    const circles: Map<string, Set<string>> = new Map();
    const assignedCircleConnections = new Set<string>();
    let circleCounter = 0;

    const isFullyConnected = (userIds: string[]): boolean => {
      for (let i = 0; i < userIds.length; i++) {
        const connections = connectionMap.get(userIds[i]) || new Set();
        for (let j = 0; j < userIds.length; j++) {
          if (i !== j && !connections.has(userIds[j])) {
            return false;
          }
        }
      }
      return true;
    };

    const findPotentialGroups = () => {
      const groups: Array<string[]> = [];
      const visitedGroups = new Set<string>();

      for (const user of users) {
        const connections = connectionMap.get(user._id);
        if (!connections || connections.size < 1) continue;

        const connectedUsers = Array.from(connections);

        for (const connectedUser of connectedUsers) {
          const pairKey = [user._id, connectedUser].sort().join("-");
          if (!visitedGroups.has(pairKey)) {
            visitedGroups.add(pairKey);
            groups.push([user._id, connectedUser]);
          }
        }

        if (connections.size >= 2) {
          for (let i = 0; i < connectedUsers.length; i++) {
            for (let j = i + 1; j < connectedUsers.length; j++) {
              const userA = connectedUsers[i];
              const userB = connectedUsers[j];

              if (connectionMap.get(userA)?.has(userB)) {
                const triangleKey = [user._id, userA, userB].sort().join("-");
                if (!visitedGroups.has(triangleKey)) {
                  visitedGroups.add(triangleKey);
                  groups.push([user._id, userA, userB]);
                }
              }
            }
          }
        }
      }

      const expandedGroups: Array<string[]> = [...groups];
      let expanded = true;

      while (expanded) {
        expanded = false;

        for (let g = 0; g < expandedGroups.length; g++) {
          const group = expandedGroups[g];
          const potentialMembers = new Set<string>();

          for (const userId of group) {
            const connections = connectionMap.get(userId) || new Set();

            if (potentialMembers.size === 0) {
              connections.forEach((conn) => potentialMembers.add(conn));
            } else {
              const toKeep = new Set<string>();
              potentialMembers.forEach((potentialId) => {
                if (
                  connections.has(potentialId) &&
                  !group.includes(potentialId)
                ) {
                  toKeep.add(potentialId);
                }
              });
              potentialMembers.clear();
              toKeep.forEach((id) => potentialMembers.add(id));
            }
          }

          for (const newMemberId of potentialMembers) {
            const newGroup = [...group, newMemberId];
            if (isFullyConnected(newGroup)) {
              const newGroupKey = newGroup.sort().join("-");
              if (!visitedGroups.has(newGroupKey)) {
                visitedGroups.add(newGroupKey);
                expandedGroups.push(newGroup);
                expanded = true;
              }
            }
          }
        }
      }

      return expandedGroups;
    };

    const potentialGroups = findPotentialGroups();

    potentialGroups.sort((a, b) => b.length - a.length);

    for (const group of potentialGroups) {
      if (
        group.some((userId) => {
          for (const [circleId, members] of circles.entries()) {
            if (members.has(userId) && members.size > group.length) {
              return true;
            }
          }
          return false;
        })
      )
        continue;

      const circleId = `circle-${circleCounter++}`;
      circles.set(circleId, new Set(group));

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const connectionKey = [group[i], group[j]].sort().join("-");
          assignedCircleConnections.add(connectionKey);
        }
      }
    }

    return {
      circles,
      assignedCircleConnections,
    };
  }

  static getConnectionColor(defaultColor: string) {
    return defaultColor;
  }

  static getCircleName(circleUsers: User[]): string {
    if (circleUsers.length === 2) {
      return "Pair";
    } else if (circleUsers.length === 3) {
      return "Triad";
    } else if (circleUsers.length === 4) {
      return "Quartet";
    } else if (circleUsers.length === 5) {
      return "Quintet";
    } else {
      return `Circle (${circleUsers.length})`;
    }
  }
}

class LayoutEngine {
  static calculateOptimalPositions(
    users: User[],
    connections: Connection[],
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    isMobile: boolean
  ) {
    const connectionData = ConnectionAnalyzer.analyzeConnections(
      users,
      connections
    );

    const layers = this.calculateLayers(users.length);

    let userPositions = this.positionUsersInLayers(
      users,
      connectionData,
      layers,
      centerX,
      centerY,
      isMobile
    );

    let circleNodes = this.processCircleNodes(
      connectionData,
      userPositions,
      centerX,
      centerY,
      isMobile,
      width,
      height
    );

    const { adjustedPositions, adjustedCircles } = this.finalCollisionCheck(
      userPositions,
      circleNodes,
      isMobile
    );

    userPositions = adjustedPositions;
    circleNodes = adjustedCircles;

    const connectionCircleMap = new Map<string, string>();
    circleNodes.forEach((circle) => {
      const userIds = circle.users.map((u: User) => u._id);
      for (let i = 0; i < userIds.length; i++) {
        for (let j = i + 1; j < userIds.length; j++) {
          const connectionKey = [userIds[i], userIds[j]].sort().join("-");
          connectionCircleMap.set(connectionKey, circle.id);
        }
      }
    });

    const processedConnections = this.processConnections(
      connections,
      userPositions,
      connectionCircleMap
    );

    const circleConnections = this.generateCircleConnections(
      circleNodes,
      userPositions
    );

    return {
      userPositions,
      processedConnections,
      connectionData,
      circleNodes,
      circleConnections,
      layers,
    };
  }

  static calculateLayers(userCount: number): {
    layerCount: number;
    usersPerLayer: number[];
    radiusPerLayer: number[];
  } {
    const baseRadius = 500;
    const baseUsersPerLayer = 10;

    const calculateUsersInLayer = (layerIndex: number) => {
      return Math.floor(baseUsersPerLayer * (1 + layerIndex * 0.6));
    };

    const calculateLayerRadius = (layerIndex: number) => {
      return baseRadius + layerIndex * 450;
    };

    let remainingUsers = userCount;
    const usersPerLayer: number[] = [];
    const radiusPerLayer: number[] = [];
    let layerIndex = 0;

    while (remainingUsers > 0) {
      const usersInThisLayer = Math.min(
        calculateUsersInLayer(layerIndex),
        remainingUsers
      );
      usersPerLayer.push(usersInThisLayer);
      radiusPerLayer.push(calculateLayerRadius(layerIndex));
      remainingUsers -= usersInThisLayer;
      layerIndex++;
    }

    return {
      layerCount: usersPerLayer.length,
      usersPerLayer,
      radiusPerLayer,
    };
  }

  static positionUsersInLayers(
    users: User[],
    connectionData: any,
    layers: {
      layerCount: number;
      usersPerLayer: number[];
      radiusPerLayer: number[];
    },
    centerX: number,
    centerY: number,
    isMobile: boolean
  ) {
    const { usersPerLayer, radiusPerLayer } = layers;
    const positions: {
      user: User;
      x: number;
      y: number;
      layer: number;
      angle: number;
      directConnections: string[];
      directConnectionsCount: number;
    }[] = [];

    let userIndex = 0;

    for (let layer = 0; layer < usersPerLayer.length; layer++) {
      const radius = isMobile
        ? radiusPerLayer[layer] * GRAPH_CONFIG.MOBILE.SCALE_FACTOR
        : radiusPerLayer[layer];

      const userCount = usersPerLayer[layer];

      const nodeWidth =
        GRAPH_CONFIG.SPOKE_SIZE.w *
        (isMobile ? GRAPH_CONFIG.MOBILE.SCALE_FACTOR : 1);
      const circumference = 2 * Math.PI * radius;
      const minAngleStep = ((nodeWidth * 1.3) / circumference) * (2 * Math.PI);

      const angleStep = Math.max(minAngleStep, (2 * Math.PI) / userCount);

      const startAngle = -Math.PI / 2 - (angleStep * (userCount - 1)) / 2;

      for (let i = 0; i < userCount; i++) {
        if (userIndex >= users.length) break;

        const user = users[userIndex];
        const angle = startAngle + i * angleStep;

        positions.push({
          user,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          layer,
          angle,
          directConnections: [],
          directConnectionsCount: 0,
        });

        userIndex++;
      }
    }

    for (const pos of positions) {
      const connections =
        connectionData.directConnectionMap.get(pos.user._id) || new Set();
      pos.directConnections = Array.from(connections);
      pos.directConnectionsCount = connections.size;
    }

    return positions;
  }

  static processCircleNodes(
    connectionData: any,
    userPositions: any[],
    centerX: number,
    centerY: number,
    isMobile: boolean,
    width: number,
    height: number
  ) {
    const circleNodes: {
      id: string;
      users: User[];
      position: { x: number; y: number };
      color: string;
      name: string;
      userCount: number;
      radius: number;
    }[] = [];
    const minDistanceBetweenCircles = isMobile ? 100 : 150;
    Array.from(connectionData.circles.entries()).forEach((entry, index) => {
      const [circleId, userIds] = entry as [string, Set<string>];
      const circleUserIds = Array.from(userIds);
      if (circleUserIds.length === 0) return;

      const circleUsers = circleUserIds
        .map((id) => connectionData.userMap.get(id)!)
        .filter(Boolean);

      const userPositionsList = circleUserIds
        .map((userId) => {
          const position = userPositions.find((p) => p.user._id === userId);
          return position ? { x: position.x, y: position.y } : null;
        })
        .filter(Boolean);

      if (userPositionsList.length === 0) return;

      const position = {
        x:
          userPositionsList.reduce((sum, pos) => sum + pos!.x, 0) /
          userPositionsList.length,
        y:
          userPositionsList.reduce((sum, pos) => sum + pos!.y, 0) /
          userPositionsList.length,
      };

      const distanceFromCenter = Math.sqrt(
        Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2)
      );

      if (distanceFromCenter < 100) {
        const angle = Math.atan2(position.y - centerY, position.x - centerX);
        const offsetDistance = isMobile ? 80 : 120;
        position.x = centerX + offsetDistance * Math.cos(angle);
        position.y = centerY + offsetDistance * Math.sin(angle);
      }

      const color =
        GRAPH_CONFIG.COLORS.CIRCLE_GROUP_COLORS[
          index % GRAPH_CONFIG.COLORS.CIRCLE_GROUP_COLORS.length
        ];

      const name = ConnectionAnalyzer.getCircleName(circleUsers);

      circleNodes.push({
        id: circleId,
        users: circleUsers,
        position,
        color,
        name,
        userCount: circleUsers.length,
        radius: isMobile ? 10 : 20,
      });
    });

    const iterations = 100;
    for (let iter = 0; iter < iterations; iter++) {
      let totalMovement = 0;

      const userRectangles = userPositions.map((pos) => {
        const scale = isMobile ? GRAPH_CONFIG.MOBILE.SCALE_FACTOR : 1;
        const width = GRAPH_CONFIG.SPOKE_SIZE.w * scale;
        const height = GRAPH_CONFIG.SPOKE_SIZE.h * scale;
        return {
          id: pos.user._id,
          x1: pos.x - width / 2 - 10,
          y1: pos.y - height / 2 - 10,
          x2: pos.x + width / 2 + 10,
          y2: pos.y + height / 2 + 10,
          centerX: pos.x,
          centerY: pos.y,
        };
      });

      for (const circle of circleNodes) {
        const circleRadius = circle.radius + 10;

        for (const rect of userRectangles) {
          const testX = Math.max(rect.x1, Math.min(circle.position.x, rect.x2));
          const testY = Math.max(rect.y1, Math.min(circle.position.y, rect.y2));

          const distX = circle.position.x - testX;
          const distY = circle.position.y - testY;
          const distance = Math.sqrt(distX * distX + distY * distY);

          if (distance < circleRadius) {
            const forceDirectionX = circle.position.x - rect.centerX;
            const forceDirectionY = circle.position.y - rect.centerY;
            const forceMag = Math.sqrt(
              forceDirectionX * forceDirectionX +
                forceDirectionY * forceDirectionY
            );

            const moveDistance = circleRadius - distance + 30;

            if (forceMag < 0.01) {
              const angle = Math.random() * 2 * Math.PI;
              circle.position.x += Math.cos(angle) * moveDistance;
              circle.position.y += Math.sin(angle) * moveDistance;
            } else {
              circle.position.x += (forceDirectionX / forceMag) * moveDistance;
              circle.position.y += (forceDirectionY / forceMag) * moveDistance;
            }

            totalMovement += moveDistance;
          }
        }
      }

      for (let i = 0; i < circleNodes.length; i++) {
        for (let j = i + 1; j < circleNodes.length; j++) {
          const dx = circleNodes[i].position.x - circleNodes[j].position.x;
          const dy = circleNodes[i].position.y - circleNodes[j].position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist =
            circleNodes[i].radius +
            circleNodes[j].radius +
            minDistanceBetweenCircles;

          if (distance < minDist) {
            const force = ((minDist - distance) / minDist) * 1.5;
            const moveX = dx * force * 0.5;
            const moveY = dy * force * 0.5;

            circleNodes[i].position.x += moveX;
            circleNodes[i].position.y += moveY;
            circleNodes[j].position.x -= moveX;
            circleNodes[j].position.y -= moveY;
            totalMovement += Math.abs(moveX) + Math.abs(moveY);
          }
        }
      }

      for (const circle of circleNodes) {
        const dx = circle.position.x - centerX;
        const dy = circle.position.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistFromHub = isMobile ? 180 : 240;

        if (distance < minDistFromHub) {
          const force = (minDistFromHub - distance) / minDistFromHub;
          const angle = Math.atan2(dy, dx);
          circle.position.x += Math.cos(angle) * force * 30;
          circle.position.y += Math.sin(angle) * force * 30;
          totalMovement += force * 30;
        }
      }

      const margin = 100;
      const boundaryForce = 0.2;

      for (const circle of circleNodes) {
        if (circle.position.x - circle.radius < margin) {
          circle.position.x +=
            boundaryForce * (margin - (circle.position.x - circle.radius));
          totalMovement += boundaryForce;
        }
        if (circle.position.x + circle.radius > width - margin) {
          circle.position.x -=
            boundaryForce *
            (circle.position.x + circle.radius - (width - margin));
          totalMovement += boundaryForce;
        }
        if (circle.position.y - circle.radius < margin) {
          circle.position.y +=
            boundaryForce * (margin - (circle.position.y - circle.radius));
          totalMovement += boundaryForce;
        }
        if (circle.position.y + circle.radius > height - margin) {
          circle.position.y -=
            boundaryForce *
            (circle.position.y + circle.radius - (height - margin));
          totalMovement += boundaryForce;
        }
      }

      if (totalMovement < 0.1) break;
    }

    return circleNodes;
  }

  static finalCollisionCheck(
    userPositions: any[],
    circleNodes: any[],
    isMobile: boolean
  ) {
    const adjustedPositions = [...userPositions];
    const adjustedCircles = [...circleNodes];

    const scale = isMobile ? GRAPH_CONFIG.MOBILE.SCALE_FACTOR : 1;
    const nodeWidth = GRAPH_CONFIG.SPOKE_SIZE.w * scale;
    const nodeHeight = GRAPH_CONFIG.SPOKE_SIZE.h * scale;

    const nodeSwapIterations = 10;

    for (let iter = 0; iter < nodeSwapIterations; iter++) {
      let improved = false;

      for (let layer = 0; layer < 10; layer++) {
        const layerNodes = adjustedPositions.filter((p) => p.layer === layer);
        if (layerNodes.length < 2) continue;

        layerNodes.sort((a, b) => a.angle - b.angle);

        for (let i = 0; i < layerNodes.length; i++) {
          const j = (i + 1) % layerNodes.length;

          const node1 = layerNodes[i];
          const node2 = layerNodes[j];

          const currentRect1 = {
            x: node1.x - nodeWidth / 2,
            y: node1.y - nodeHeight / 2,
            width: nodeWidth,
            height: nodeHeight,
          };

          const currentRect2 = {
            x: node2.x - nodeWidth / 2,
            y: node2.y - nodeHeight / 2,
            width: nodeWidth,
            height: nodeHeight,
          };

          const currentOverlap = this.calculateRectOverlap(
            currentRect1,
            currentRect2
          );

          const swappedRect1 = {
            x: node2.x - nodeWidth / 2,
            y: node2.y - nodeHeight / 2,
            width: nodeWidth,
            height: nodeHeight,
          };

          const swappedRect2 = {
            x: node1.x - nodeWidth / 2,
            y: node1.y - nodeHeight / 2,
            width: nodeWidth,
            height: nodeHeight,
          };

          const swappedOverlap = this.calculateRectOverlap(
            swappedRect1,
            swappedRect2
          );

          if (swappedOverlap < currentOverlap) {
            const tempX = node1.x;
            const tempY = node1.y;

            node1.x = node2.x;
            node1.y = node2.y;

            node2.x = tempX;
            node2.y = tempY;

            improved = true;
          }
        }
      }

      if (!improved) break;
    }

    return {
      adjustedPositions,
      adjustedCircles,
    };
  }

  static calculateRectOverlap(rect1: any, rect2: any): number {
    if (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    ) {
      const xOverlap = Math.min(
        rect1.x + rect1.width - rect2.x,
        rect2.x + rect2.width - rect1.x
      );

      const yOverlap = Math.min(
        rect1.y + rect1.height - rect2.y,
        rect2.y + rect2.height - rect1.y
      );

      return xOverlap * yOverlap;
    }

    return 0;
  }

  static processConnections(
    connections: Connection[],
    userPositions: any[],
    connectionCircleMap: Map<string, string>
  ) {
    return connections
      .map((conn) => {
        const userAPos = userPositions.find(
          (p) => p.user._id === conn.userA._id
        );
        const userBPos = userPositions.find(
          (p) => p.user._id === conn.userB._id
        );

        if (!userAPos || !userBPos) return null;

        const connectionKey = [conn.userA._id, conn.userB._id].sort().join("-");
        const circleId = connectionCircleMap.get(connectionKey);

        if (circleId) {
          return null;
        }

        const midX = (userAPos.x + userBPos.x) / 2;
        const midY = (userAPos.y + userBPos.y) / 2;

        const color = ConnectionAnalyzer.getConnectionColor(
          GRAPH_CONFIG.COLORS.CONNECTION_LINE
        );

        return {
          ...conn,
          userAPos,
          userBPos,
          labelPosition: { x: midX, y: midY },
          color,
        };
      })
      .filter(Boolean);
  }

  static generateCircleConnections(circleNodes: any[], userPositions: any[]) {
    const circleConnections: {
      circleId: string;
      userId: string;
      userPos: { x: number; y: number };
      circlePos: { x: number; y: number };
      color: string;
    }[] = [];

    circleNodes.forEach((circle) => {
      circle.users.forEach((user: User) => {
        const userPos = userPositions.find((p) => p.user._id === user._id);
        if (userPos) {
          circleConnections.push({
            circleId: circle.id,
            userId: user._id,
            userPos: { x: userPos.x, y: userPos.y },
            circlePos: circle.position,
            color: circle.color,
          });
        }
      });
    });

    return circleConnections;
  }

  static calculateOptimalTextSize(
    text: string,
    maxWidth: number
  ): { fontSize: number; truncated: string } {
    const baseFontSize = 14;
    const charWidth = 7.5;
    const maxChars = Math.floor(maxWidth / charWidth);

    if (text.length <= maxChars) {
      return { fontSize: baseFontSize, truncated: text };
    }

    return {
      fontSize: baseFontSize,
      truncated: text.slice(0, maxChars - 3) + "...",
    };
  }
}

// ============================================================================
// COMPONENT IMPLEMENTATIONS
// ============================================================================

function HubNode({
  x,
  y,
  avatar,
  name,
  email,
  isMobile,
}: {
  x: number;
  y: number;
  avatar?: string;
  name: string;
  email?: string;
  isMobile: boolean;
}) {
  const scale = isMobile ? GRAPH_CONFIG.MOBILE.SCALE_FACTOR : 1;
  const { w, h } = {
    w: GRAPH_CONFIG.HUB_SIZE.w * scale,
    h: GRAPH_CONFIG.HUB_SIZE.h * scale,
  };
  const { HUB_FILL, HUB_STROKE } = GRAPH_CONFIG.COLORS;

  const nameText = LayoutEngine.calculateOptimalTextSize(name, w - 120);
  const emailText = email
    ? LayoutEngine.calculateOptimalTextSize(email, w - 120)
    : null;

  const fontSize = isMobile ? nameText.fontSize * 0.9 : nameText.fontSize;
  const emailFontSize = isMobile ? 9 : 11;

  return (
    <g className="transition-all duration-200">
      <rect
        x={x - w / 2 + 3}
        y={y - h / 2 + 3}
        width={w}
        height={h}
        rx={16}
        fill="rgba(0,0,0,0.2)"
        opacity={0.2}
      />

      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={16}
        fill={HUB_FILL}
        stroke={HUB_STROKE}
        strokeWidth={3}
        style={{
          filter: "drop-shadow(0 6px 20px rgba(245, 158, 11, 0.3))",
        }}
      />

      <foreignObject
        x={x - w / 2 + 18}
        y={y - h / 2 + 14}
        width={h - 28}
        height={h - 28}
      >
        <div className="w-full h-full">
          <Avatar className="w-full h-full border-4 border-white shadow-lg">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-orange-100 text-orange-800 font-bold text-lg">
              {name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </foreignObject>

      <text
        x={x - w / 2 + h + 8}
        y={y - 8}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        fill="#78350f"
        dominantBaseline="middle"
      >
        {nameText.truncated}
      </text>

      {emailText && (
        <text
          x={x - w / 2 + h + 8}
          y={y + 14}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={emailFontSize}
          fill="#a16207"
          dominantBaseline="middle"
        >
          {emailText.truncated}
        </text>
      )}

      <text
        x={x}
        y={y + h / 2 + (isMobile ? 15 : 20)}
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fontSize={isMobile ? 10 : 12}
        fill="#d97706"
      >
        HUB
      </text>
    </g>
  );
}

function SpokeNode({
  x,
  y,
  avatar,
  name,
  email,
  highlight,
  isSelected,
  isSearchResult,
  connectionCount,
  inCircle,
  circleColor,
  microCircles,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isMobile,
}: {
  x: number;
  y: number;
  avatar?: string;
  name: string;
  email?: string;
  highlight?: boolean;
  isSelected?: boolean;
  isSearchResult?: boolean;
  connectionCount: number;
  inCircle?: boolean;
  circleColor?: string;
  microCircles?: Array<{ id: string; name: string; color: string }>;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isMobile: boolean;
}) {
  const scale = isMobile ? GRAPH_CONFIG.MOBILE.SCALE_FACTOR : 1;
  const { w, h } = {
    w: GRAPH_CONFIG.SPOKE_SIZE.w * scale,
    h: GRAPH_CONFIG.SPOKE_SIZE.h * scale,
  };
  const {
    SPOKE_FILL,
    SPOKE_STROKE,
    SPOKE_HOVER,
    SPOKE_SELECTED,
    SEARCH_HIGHLIGHT,
  } = GRAPH_CONFIG.COLORS;

  const maxTextWidth = isMobile ? w - 70 : w - 90;
  const nameText = LayoutEngine.calculateOptimalTextSize(name, maxTextWidth);
  const emailText = email
    ? LayoutEngine.calculateOptimalTextSize(email, maxTextWidth)
    : null;

  let strokeColor = SPOKE_STROKE;
  if (isSearchResult) {
    strokeColor = SEARCH_HIGHLIGHT;
  } else if (isSelected) {
    strokeColor = SPOKE_SELECTED;
  } else if (highlight) {
    strokeColor = circleColor || SPOKE_HOVER;
  } else if (inCircle) {
    strokeColor = circleColor || SPOKE_STROKE;
  }

  const strokeWidth =
    isSelected || isSearchResult ? 3 : highlight ? 2.5 : inCircle ? 2 : 1.5;
  const fontSize = isMobile ? nameText.fontSize * 0.9 : nameText.fontSize;
  const emailFontSize = isMobile ? 9 : 10;

  return (
    <g
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: onClick ? "pointer" : "default" }}
      className="transition-all duration-200"
    >
      <rect
        x={x - w / 2 + 2}
        y={y - h / 2 + 2}
        width={w}
        height={h}
        rx={12}
        fill="rgba(0,0,0,0.1)"
        opacity={0.15}
      />

      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={12}
        fill={SPOKE_FILL}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          filter:
            highlight || isSelected || isSearchResult
              ? `drop-shadow(0 4px 16px ${strokeColor}40)`
              : "none",
          transition: "all 0.2s ease",
        }}
      />

      <foreignObject
        x={x - w / 2 + 14}
        y={y - h / 2 + 12}
        width={h - 24}
        height={h - 24}
      >
        <div className="w-full h-full">
          <Avatar className="w-full h-full border-2 border-white shadow-sm">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-gray-100 text-gray-800 font-semibold">
              {name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </foreignObject>

      <text
        x={x - w / 2 + h + 6}
        y={y - 10}
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="600"
        fontSize={fontSize}
        fill="#1e293b"
        dominantBaseline="middle"
      >
        {nameText.truncated}
      </text>

      {emailText && (
        <text
          x={x - w / 2 + h + 6}
          y={y + 8}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize={emailFontSize}
          fill="#64748b"
          dominantBaseline="middle"
        >
          {emailText.truncated}
        </text>
      )}

      {connectionCount > 0 && (
        <g>
          <circle
            cx={x + w / 2 - 12}
            cy={y - h / 2 + 12}
            r={isMobile ? 8 : 10}
            fill={inCircle ? circleColor || "#3b82f6" : "#3b82f6"}
            stroke="white"
            strokeWidth={1.5}
          />
          <text
            x={x + w / 2 - 12}
            y={y - h / 2 + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isMobile ? 8 : 9}
            fontWeight="bold"
            fill="white"
          >
            {connectionCount}
          </text>
        </g>
      )}

      {microCircles && microCircles.length > 0 && (
        <g className="micro-circle-indicators">
          <foreignObject
            x={x - w / 2 + 14}
            y={y + h / 2 - 12}
            width={w - 28}
            height={16}
          >
            <div className="flex gap-1 overflow-hidden">
              {microCircles.slice(0, 3).map((circle) => (
                <div
                  key={circle.id}
                  className="h-4 rounded-full px-1.5 text-[9px] flex items-center justify-center text-white shadow-sm whitespace-nowrap"
                  style={{ backgroundColor: circle.color }}
                  title={circle.name}
                >
                  {circle.name}
                </div>
              ))}
              {microCircles.length > 3 && (
                <div
                  className="h-4 rounded-full bg-gray-200 px-1 flex items-center justify-center text-[9px] text-gray-600 font-semibold border border-white shadow-sm"
                  title={`${microCircles.length - 3} more circle(s)`}
                >
                  +{microCircles.length - 3}
                </div>
              )}
            </div>
          </foreignObject>
        </g>
      )}

      {isSelected && (
        <>
          <rect
            x={x - w / 2 - 6}
            y={y - h / 2 - 6}
            width={w + 12}
            height={h + 12}
            rx={16}
            fill="none"
            stroke={SPOKE_SELECTED}
            strokeWidth={2}
            strokeOpacity={0.3}
            style={{
              filter: `drop-shadow(0 0 10px ${SPOKE_SELECTED})`,
            }}
          />

          <rect
            x={x - w / 2 - 2}
            y={y - h / 2 - 2}
            width={w + 4}
            height={h + 4}
            rx={14}
            fill="none"
            stroke={SPOKE_SELECTED}
            strokeWidth={3}
            strokeDasharray="6 3"
            style={{
              filter: `drop-shadow(0 0 12px ${SPOKE_SELECTED}90)`,
            }}
          />
        </>
      )}

      {isSearchResult && (
        <rect
          x={x - w / 2 - 8}
          y={y - h / 2 - 8}
          width={w + 16}
          height={h + 16}
          rx={16}
          fill="none"
          stroke={SEARCH_HIGHLIGHT}
          strokeWidth={2.5}
          strokeOpacity={0.7}
          strokeDasharray="10 5"
          style={{
            filter: `drop-shadow(0 0 15px ${SEARCH_HIGHLIGHT})`,
            animation: "pulse 1.5s infinite ease-in-out",
          }}
        />
      )}

      {highlight && !isSelected && !isSearchResult && (
        <rect
          x={x - w / 2 - 4}
          y={y - h / 2 - 4}
          width={w + 8}
          height={h + 8}
          rx={14}
          fill="none"
          stroke={circleColor || SPOKE_HOVER}
          strokeWidth={3}
          strokeOpacity={0.8}
          style={{
            filter: `drop-shadow(0 0 8px ${circleColor || SPOKE_HOVER}80)`,
            animation: "pulse 2s infinite ease-in-out",
          }}
        />
      )}
    </g>
  );
}

function CircleNode({
  x,
  y,
  color,
  userCount,
  isHighlighted,
  isMobile,
}: {
  x: number;
  y: number;
  color: string;
  userCount: number;
  isHighlighted?: boolean;
  isMobile: boolean;
}) {
  const radius = isMobile ? 10 : 20;

  return (
    <g className="transition-all duration-200">
      <circle
        cx={x}
        cy={y}
        r={radius + 6}
        fill={color}
        opacity={0.15}
        style={{
          filter: isHighlighted ? `blur(8px)` : `blur(5px)`,
        }}
      />

      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={color}
        fillOpacity={isHighlighted ? 0.8 : 0.7}
        stroke="white"
        strokeWidth={3}
        style={{
          filter: isHighlighted
            ? `drop-shadow(0 0 10px ${color})`
            : `drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2))`,
          transition: "all 0.2s ease",
        }}
      />

      <circle
        cx={x}
        cy={y - radius + 10}
        r={isMobile ? 8 : 11}
        fill="white"
        stroke={color}
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={y - radius + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={isMobile ? 8 : 10}
        fontWeight="bold"
        fill={color}
      >
        {userCount}
      </text>
    </g>
  );
}

function ConnectionLine({
  sourceX,
  sourceY,
  targetX,
  targetY,
  color,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  isMobile,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color: string;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isMobile: boolean;
}) {
  const baseWidth = isMobile
    ? GRAPH_CONFIG.CONNECTION_LINE_WIDTH * 0.8
    : GRAPH_CONFIG.CONNECTION_LINE_WIDTH;
  const strokeWidth = isHighlighted ? baseWidth + 2 : baseWidth;
  const opacity = isHighlighted ? 1 : 0.9;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const angle = Math.atan2(dy, dx);

  const hitAreaWidth = isMobile ? 30 : 20;
  const x1 = sourceX;
  const y1 = sourceY;
  const x2 = targetX;
  const y2 = targetY;
  const x3 = x2 - hitAreaWidth * Math.sin(angle);
  const y3 = y2 + hitAreaWidth * Math.cos(angle);
  const x4 = x1 - hitAreaWidth * Math.sin(angle);
  const y4 = y1 + hitAreaWidth * Math.cos(angle);

  return (
    <>
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        stroke={color}
        strokeWidth={strokeWidth + 4}
        opacity={0.15}
        style={{
          filter: "blur(4px)",
        }}
      />

      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        className="transition-all duration-200"
        style={{
          filter: isHighlighted
            ? `drop-shadow(0 2px 8px ${color}60)`
            : "drop-shadow(0 1px 3px rgba(0,0,0,0.2))",
        }}
      />

      <polygon
        points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
        fill="transparent"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ cursor: "pointer" }}
      />
    </>
  );
}

function CircleConnectionLine({
  userX,
  userY,
  circleX,
  circleY,
  color,
  isHighlighted,
  isMobile,
}: {
  userX: number;
  userY: number;
  circleX: number;
  circleY: number;
  color: string;
  isHighlighted?: boolean;
  isMobile: boolean;
}) {
  const scale = isMobile ? GRAPH_CONFIG.MOBILE.SCALE_FACTOR : 1;
  const baseWidth = GRAPH_CONFIG.CONNECTION_LINE_WIDTH * scale;
  const strokeWidth = isHighlighted ? baseWidth + 1 : baseWidth;
  const opacity = isHighlighted ? 1 : 0.8;

  return (
    <>
      <line
        x1={userX}
        y1={userY}
        x2={circleX}
        y2={circleY}
        stroke={color}
        strokeWidth={strokeWidth + 3}
        opacity={0.15}
        style={{
          filter: "blur(3px)",
        }}
      />

      <line
        x1={userX}
        y1={userY}
        x2={circleX}
        y2={circleY}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        className="transition-all duration-200"
        style={{
          filter: isHighlighted ? `drop-shadow(0 1px 4px ${color}80)` : "none",
        }}
      />
    </>
  );
}

function ConnectionLabel({
  x,
  y,
  name,
  color,
  onDelete,
  isHighlighted,
  isMobile,
}: {
  x: number;
  y: number;
  name: string;
  color: string;
  onDelete?: () => void;
  isHighlighted?: boolean;
  isMobile: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const scale = isMobile ? GRAPH_CONFIG.MOBILE.SCALE_FACTOR : 1;
  const { w, h } = {
    w: GRAPH_CONFIG.CONNECTION_LABEL_SIZE.w * scale,
    h: GRAPH_CONFIG.CONNECTION_LABEL_SIZE.h * scale,
  };

  const labelText = LayoutEngine.calculateOptimalTextSize(name, w - 20);
  const localHighlight = hover || isHighlighted;

  return (
    <>
      <g
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="transition-all duration-200"
      >
        <rect
          x={x - w / 2}
          y={y - h / 2}
          width={w}
          height={h}
          rx={18}
          fill={color}
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth={2}
          opacity={localHighlight ? 1 : 0.9}
          style={{
            filter: localHighlight
              ? `drop-shadow(0 4px 12px ${color}50)`
              : "drop-shadow(0 2px 6px rgba(0,0,0,0.1))",
            transition: "all 0.2s ease",
          }}
        />

        <text
          x={x}
          y={y + 2}
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontSize={isMobile ? 10 : 12}
          fill="white"
          dominantBaseline="middle"
          style={{
            pointerEvents: "none",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {labelText.truncated}
        </text>

        {localHighlight && onDelete && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={x + w / 2 - 8}
              cy={y - h / 2 + 8}
              r={isMobile ? 8 : 10}
              fill="#ef4444"
              stroke="white"
              strokeWidth={2}
              style={{
                filter: "drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4))",
              }}
            />
            <text
              x={x + w / 2 - 8}
              y={y - h / 2 + 8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isMobile ? 8 : 10}
              fill="white"
              fontWeight="bold"
            >
              ×
            </text>
          </g>
        )}
      </g>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <DialogTitle>Delete Connection</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to delete the "{name}" connection? This
                action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (onDelete) {
                  onDelete();
                }
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MobileOverlay({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div
      className="fixed inset-x-0 z-[100] pointer-events-none"
      style={{
        bottom: "max(env(safe-area-inset-bottom), 16px)",
      }}
    >
      <div className="flex justify-center">
        <div className="pointer-events-auto w-[92vw] max-w-[400px]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function SelectionInfoCard({
  selectedUser,
  onClearSelection,
  isMobile,
}: {
  selectedUser: { user: User; connections: User[] };
  onClearSelection: () => void;
  isMobile: boolean;
}) {
  const content = (
    <Card className="shadow-xl border-blue-200 rounded-2xl overflow-hidden">
      <CardContent className={isMobile ? "pt-3 px-3 pb-3" : "pt-5 px-5 pb-4"}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Avatar
              className={
                isMobile
                  ? "border-2 border-blue-100 w-8 h-8"
                  : "border-2 border-blue-100 w-9 h-9"
              }
            >
              <AvatarImage
                src={selectedUser.user.profileImage}
                alt={selectedUser.user.username}
              />
              <AvatarFallback className="bg-blue-100 text-blue-800 text-[10px] md:text-xs font-semibold">
                {selectedUser.user.username
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3
                className={
                  isMobile
                    ? "font-semibold text-[13px] leading-tight"
                    : "font-semibold text-sm leading-tight"
                }
              >
                {selectedUser.user.username}
              </h3>
              {selectedUser.user.email && (
                <p
                  className={
                    isMobile
                      ? "text-[10px] text-gray-500 mt-0.5"
                      : "text-xs text-gray-500 mt-0.5"
                  }
                >
                  {selectedUser.user.email}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={
              isMobile ? "rounded-full h-7 w-7" : "rounded-full h-8 w-8"
            }
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {selectedUser.user.microCircles &&
          selectedUser.user.microCircles.length > 0 && (
            <div className={isMobile ? "mb-1.5" : "mb-2"}>
              <h5
                className={
                  isMobile
                    ? "text-[10px] font-medium mb-1 flex items-center"
                    : "text-xs font-medium mb-1 flex items-center"
                }
              >
                <CircleIcon className="h-3 w-3 mr-1" />
                Member of
              </h5>
              <div className="flex flex-wrap gap-1">
                {selectedUser.user.microCircles.map((circle) => (
                  <Badge
                    key={circle.id}
                    style={{ backgroundColor: circle.color }}
                    className={
                      isMobile
                        ? "text-white text-[9px] py-0 px-1"
                        : "text-white text-xs"
                    }
                  >
                    {circle.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        <div className={isMobile ? "mt-3" : "mt-4"}>
          <h5
            className={
              isMobile
                ? "text-[10px] font-medium mb-1.5 flex items-center gap-1"
                : "text-xs font-medium mb-2 flex items-center gap-1"
            }
          >
            <LinkIcon className="h-3 w-3" />
            <span>
              {selectedUser.connections.length} Connection
              {selectedUser.connections.length !== 1 ? "s" : ""}
            </span>
          </h5>

          <div
            className={
              isMobile
                ? "flex flex-wrap gap-1 max-h-[40vh] overflow-auto pr-1"
                : "flex flex-wrap gap-1"
            }
          >
            {selectedUser.connections.length > 0 ? (
              selectedUser.connections.map((user) => (
                <Badge
                  key={user._id}
                  variant="secondary"
                  className={
                    isMobile
                      ? "text-[10px] font-normal py-0 px-1"
                      : "text-xs font-normal"
                  }
                >
                  {user.username}
                </Badge>
              ))
            ) : (
              <span
                className={
                  isMobile
                    ? "text-[10px] text-gray-500"
                    : "text-xs text-gray-500"
                }
              >
                No connections
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!isMobile) {
    return (
      <div className="absolute top-4 right-4 max-w-[280px] z-50">{content}</div>
    );
  }

  return <MobileOverlay>{content}</MobileOverlay>;
}

function EnhancedMultiSelectCard({
  selectedUsers,
  hasExistingConnection,
  onCreateConnections,
  onDeleteConnections,
  onClearSelection,
  isMobile,
}: {
  selectedUsers: User[];
  hasExistingConnection: boolean;
  onCreateConnections: () => void;
  onDeleteConnections: () => void;
  onClearSelection: () => void;
  isMobile: boolean;
}) {
  const content = (
    <Card className="shadow-xl border-blue-200 rounded-2xl overflow-hidden">
      <CardContent className={isMobile ? "pt-3 px-3 pb-3" : "pt-5 px-5 pb-4"}>
        <div className="flex justify-between items-start mb-1">
          <h3
            className={
              isMobile
                ? "font-semibold text-[13px] flex items-center"
                : "font-semibold text-sm flex items-center"
            }
          >
            <Users className={isMobile ? "h-4 w-4 mr-1" : "h-4 w-4 mr-1.5"} />
            {selectedUsers.length} Users Selected
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className={
              isMobile ? "rounded-full h-7 w-7" : "rounded-full h-8 w-8"
            }
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p
          className={
            isMobile
              ? "text-[10px] text-gray-500 mb-2"
              : "text-xs text-gray-500 mb-3"
          }
        >
          {hasExistingConnection
            ? "Some of these users are already connected"
            : "These users are not directly connected"}
        </p>

        <div
          className={
            isMobile
              ? "flex flex-wrap gap-1 mb-3 max-h-[40vh] overflow-auto pr-1"
              : "flex flex-wrap gap-1 mb-4"
          }
        >
          {selectedUsers.map((user) => (
            <Badge
              key={user._id}
              variant="secondary"
              className={isMobile ? "text-[10px] py-0 px-1" : "text-xs"}
            >
              {user.username}
            </Badge>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            className={isMobile ? "w-full h-9 text-[13px]" : "w-full"}
            onClick={onCreateConnections}
          >
            <Plus className="h-4 w-4 mr-1" />
            Connect Users
          </Button>
          {hasExistingConnection && (
            <Button
              size="sm"
              variant="outline"
              className={
                isMobile
                  ? "w-full h-9 text-[13px] border-red-200 hover:bg-red-50 hover:text-red-600"
                  : "w-full border-red-200 hover:bg-red-50 hover:text-red-600"
              }
              onClick={onDeleteConnections}
            >
              <Unlink className="h-4 w-4 mr-1" />
              Remove Connections
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!isMobile) {
    return (
      <div className="absolute top-4 right-4 max-w-[300px] z-50">{content}</div>
    );
  }

  return <MobileOverlay>{content}</MobileOverlay>;
}

export default function HubCircleGraph({
  host,
  users = [],
  connections = [],
  microCircles = [],
  width = 1000,
  height = 800,
  onCreateConnection,
  onDeleteConnection,
  onCreateMultipleConnections,
  onDeleteMultipleConnections,
}: HubCircleGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([
    0,
    0,
    width,
    height,
  ]);
  const [isPanMode, setIsPanMode] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [hoverUser, setHoverUser] = useState<string | null>(null);
  const [hoverCircle, setHoverCircle] = useState<string | null>(null);
  const [hoverConnection, setHoverConnection] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < GRAPH_CONFIG.MOBILE.BREAKPOINT);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleSelectStart = (e: Event) => {
      if (isPanMode) {
        e.preventDefault();
      }
    };

    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [isPanMode]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches = users
      .filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          (user.email && user.email.toLowerCase().includes(query))
      )
      .map((user) => user._id);

    setSearchResults(matches);
  }, [searchQuery, users]);

  useEffect(() => {
    if (svgRef.current) {
      if (isPanMode) {
        svgRef.current.classList.add("no-text-select");
      } else {
        svgRef.current.classList.remove("no-text-select");
      }
    }
  }, [isPanMode]);

  const layoutData = useMemo(() => {
    const centerX = width / 2;
    const centerY = height / 2;

    const layout = LayoutEngine.calculateOptimalPositions(
      users,
      connections,
      centerX,
      centerY,
      width,
      height,
      isMobile
    );

    return {
      ...layout,
      centerX,
      centerY,
    };
  }, [users, connections, width, height, isMobile]);

  const getConnectedUsers = useCallback(
    (userId: string): User[] => {
      const directConnections =
        layoutData.connectionData.directConnectionMap.get(userId) || new Set();
      return Array.from(directConnections)
        .map(
          (connectedId) => layoutData.connectionData.userMap.get(connectedId)!
        )
        .filter(Boolean);
    },
    [layoutData.connectionData]
  );

  const getConnectionBetweenUsers = useCallback(
    (userAId: string, userBId: string): Connection | null => {
      const connection = layoutData.connectionData.connectionDetailMap
        .get(userAId)
        ?.get(userBId);
      return connection || null;
    },
    [layoutData.connectionData]
  );

  const areUsersDirectlyConnected = useCallback(
    (userAId: string, userBId: string): boolean => {
      const userAConnections =
        layoutData.connectionData.directConnectionMap.get(userAId);
      return userAConnections ? userAConnections.has(userBId) : false;
    },
    [layoutData.connectionData]
  );

  const checkForExistingConnections = useCallback((): boolean => {
    if (selectedUsers.length < 2) return false;

    for (let i = 0; i < selectedUsers.length; i++) {
      for (let j = i + 1; j < selectedUsers.length; j++) {
        if (areUsersDirectlyConnected(selectedUsers[i], selectedUsers[j])) {
          return true;
        }
      }
    }
    return false;
  }, [selectedUsers, areUsersDirectlyConnected]);

  const findCircleForUser = useCallback(
    (userId: string): string | null => {
      for (const circleNode of layoutData.circleNodes) {
        if (circleNode.users.some((user) => user._id === userId)) {
          return circleNode.id;
        }
      }
      return null;
    },
    [layoutData.circleNodes]
  );

  const getUserMicroCircles = useCallback(
    (userId: string) => {
      if (!microCircles) return [];

      return microCircles
        .filter((circle) =>
          circle.members.some((member) => member._id === userId)
        )
        .map((circle) => ({
          id: circle._id,
          name: circle.name,
          color: circle.color,
        }));
    },
    [microCircles]
  );

  const handleSpokeClick = useCallback(
    (userId: string) => {
      if (selectedUsers.includes(userId)) {
        setSelectedUsers((prev) => prev.filter((id) => id !== userId));
        return;
      }

      setSelectedUsers((prev) => [...prev, userId]);
    },
    [selectedUsers]
  );

  const handleCreateConnections = useCallback(() => {
    if (selectedUsers.length < 2) return;

    if (onCreateMultipleConnections) {
      const connectionPairs = [];
      for (let i = 0; i < selectedUsers.length; i++) {
        for (let j = i + 1; j < selectedUsers.length; j++) {
          if (!areUsersDirectlyConnected(selectedUsers[i], selectedUsers[j])) {
            connectionPairs.push({
              userAId: selectedUsers[i],
              userBId: selectedUsers[j],
            });
          }
        }
      }

      if (connectionPairs.length > 0) {
        onCreateMultipleConnections(connectionPairs);
      }
    } else if (onCreateConnection) {
      for (let i = 0; i < selectedUsers.length; i++) {
        for (let j = i + 1; j < selectedUsers.length; j++) {
          if (!areUsersDirectlyConnected(selectedUsers[i], selectedUsers[j])) {
            onCreateConnection(selectedUsers[i], selectedUsers[j]);
          }
        }
      }
    }

    setSelectedUsers([]);
  }, [
    selectedUsers,
    areUsersDirectlyConnected,
    onCreateMultipleConnections,
    onCreateConnection,
  ]);

  const handleDeleteConnections = useCallback(() => {
    if (selectedUsers.length < 2) return;

    if (onDeleteMultipleConnections) {
      const connectionIds = [];
      for (let i = 0; i < selectedUsers.length; i++) {
        for (let j = i + 1; j < selectedUsers.length; j++) {
          const connection = getConnectionBetweenUsers(
            selectedUsers[i],
            selectedUsers[j]
          );
          if (connection) {
            connectionIds.push(connection._id);
          }
        }
      }

      if (connectionIds.length > 0) {
        onDeleteMultipleConnections(connectionIds);
      }
    } else if (onDeleteConnection) {
      for (let i = 0; i < selectedUsers.length; i++) {
        for (let j = i + 1; j < selectedUsers.length; j++) {
          const connection = getConnectionBetweenUsers(
            selectedUsers[i],
            selectedUsers[j]
          );
          if (connection) {
            onDeleteConnection(connection._id);
          }
        }
      }
    }

    setSelectedUsers([]);
  }, [
    selectedUsers,
    getConnectionBetweenUsers,
    onDeleteMultipleConnections,
    onDeleteConnection,
  ]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (!isPanMode) return;
      e.preventDefault();

      const [vx, vy, vw, vh] = viewBox;
      const scale = e.deltaY < 0 ? 0.9 : 1.1;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = vx + (mx / rect.width) * vw;
      const cy = vy + (my / rect.height) * vh;

      const newVw = vw * scale;
      const newVh = vh * scale;

      setViewBox([
        cx - (mx / rect.width) * newVw,
        cy - (my / rect.height) * newVh,
        newVw,
        newVh,
      ]);
    },
    [isPanMode, viewBox]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanMode) {
        e.preventDefault();
        setDrag({ x: e.clientX, y: e.clientY });
        if (svgRef.current) {
          svgRef.current.style.cursor = "grabbing";
        }
      }
    },
    [isPanMode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!drag || !isPanMode) return;
      e.preventDefault();

      const dx = (((e.clientX - drag.x) * viewBox[2]) / width) * 1.0;
      const dy = (((e.clientY - drag.y) * viewBox[3]) / height) * 1.0;

      setViewBox(([vx, vy, vw, vh]) => [vx - dx, vy - dy, vw, vh]);
      setDrag({ x: e.clientX, y: e.clientY });
    },
    [drag, isPanMode, viewBox, width, height]
  );

  const handleMouseUp = useCallback(() => {
    if (svgRef.current && isPanMode) {
      svgRef.current.style.cursor = "grab";
    }
    setDrag(null);
  }, [isPanMode]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (isPanMode) {
        e.preventDefault();
        const touch = e.touches[0];
        setDrag({ x: touch.clientX, y: touch.clientY });
        setTouchStartTime(Date.now());
      }
    },
    [isPanMode]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (!drag || !isPanMode) return;
      e.preventDefault();

      const touch = e.touches[0];
      const dx = (((touch.clientX - drag.x) * viewBox[2]) / width) * 1.0;
      const dy = (((touch.clientY - drag.y) * viewBox[3]) / height) * 1.0;

      setViewBox(([vx, vy, vw, vh]) => [vx - dx, vy - dy, vw, vh]);
      setDrag({ x: touch.clientX, y: touch.clientY });
    },
    [drag, isPanMode, viewBox, width, height]
  );

  const handleTouchEnd = useCallback(() => {
    if (touchStartTime && Date.now() - touchStartTime < 200) {
    }

    setDrag(null);
    setTouchStartTime(null);
  }, [touchStartTime]);

  const zoomIn = useCallback(
    () =>
      setViewBox(([vx, vy, vw, vh]) => [
        vx + vw * 0.1,
        vy + vh * 0.1,
        vw * 0.8,
        vh * 0.8,
      ]),
    []
  );

  const zoomOut = useCallback(
    () =>
      setViewBox(([vx, vy, vw, vh]) => [
        vx - vw * 0.125,
        vy - vh * 0.125,
        vw * 1.25,
        vh * 1.25,
      ]),
    []
  );

  const resetView = useCallback(
    () => setViewBox([0, 0, width, height]),
    [width, height]
  );

  const fitView = useCallback(() => {
    const positions = [
      ...(layoutData.userPositions || []).map((pos) => ({
        x: pos.x,
        y: pos.y,
      })),
      ...(layoutData.circleNodes || []).map((node) => node.position),
    ];

    if (positions.length === 0) {
      resetView();
      return;
    }

    const minX = Math.min(...positions.map((p) => p.x)) - 150;
    const minY = Math.min(...positions.map((p) => p.y)) - 100;
    const maxX = Math.max(...positions.map((p) => p.x)) + 150;
    const maxY = Math.max(...positions.map((p) => p.y)) + 100;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const scaleX = width / contentWidth;
    const scaleY = height / contentHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;

    const viewBoxWidth = width / scale;
    const viewBoxHeight = height / scale;

    const viewBoxX = minX - (viewBoxWidth - contentWidth) / 2;
    const viewBoxY = minY - (viewBoxHeight - contentHeight) / 2;

    setViewBox([viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight]);
  }, [width, height, layoutData, resetView]);

  const stats = {
    users: users.length,
    connections: connections.length,
    selected: selectedUsers.length,
    circleGroups: layoutData.circleNodes.length,
  };

  const primarySelectedUserInfo =
    selectedUsers.length === 1
      ? {
          user: {
            ...layoutData.userPositions.find(
              (p) => p.user._id === selectedUsers[0]
            )?.user!,
            microCircles: getUserMicroCircles(selectedUsers[0]),
          },
          connections: getConnectedUsers(selectedUsers[0]),
        }
      : null;

  const hasExistingConnections = checkForExistingConnections();

  const selectedUserObjects = selectedUsers
    .map((id) => users.find((u) => u._id === id))
    .filter(Boolean) as User[];

  return (
    <div className="flex flex-col w-full h-full">
      <div className="w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-[300px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {stats.selected > 0 && (
              <div className="ml-2 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                <Network className="h-4 w-4 text-blue-600" />
                <span className="text-blue-600 font-medium">
                  {stats.selected}
                </span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={zoomIn}
                    className="h-8 w-8"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={zoomOut}
                    className="h-8 w-8"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fitView}
                    className="h-8 w-8"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPanMode(!isPanMode)}
                    className={`h-8 w-8 ${
                      isPanMode ? "bg-blue-100 text-blue-700" : ""
                    }`}
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPanMode ? "Exit Pan Mode" : "Pan Mode"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div
          className={`${
            isMenuOpen ? "block" : "hidden"
          } md:block border-t border-gray-100 overflow-x-auto`}
        >
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between min-w-[600px] px-4 py-2">
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-500 text-white text-xs flex items-center justify-center h-5 w-5">
                  H
                </div>
                <span className="text-sm whitespace-nowrap">Host</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-white border border-gray-300 text-xs flex items-center justify-center h-5 w-5">
                  U
                </div>
                <span className="text-sm whitespace-nowrap">User</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center h-5 w-5">
                  C
                </div>
                <span className="text-sm whitespace-nowrap">Group</span>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-gray-600 flex-shrink-0 my-2 md:my-0">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{stats.users}</span>
              </div>
              <div className="flex items-center gap-1">
                <LinkIcon className="h-4 w-4" />
                <span>{stats.connections}</span>
              </div>
              <div className="flex items-center gap-1">
                <CircleIcon className="h-4 w-4" />
                <span>{stats.circleGroups}</span>
              </div>
            </div>

            <div className="flex md:hidden items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                className="h-8 px-2"
              >
                <ZoomIn className="h-4 w-4 mr-1" /> Zoom In
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                className="h-8 px-2"
              >
                <ZoomOut className="h-4 w-4 mr-1" /> Zoom Out
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fitView}
                className="h-8 px-2"
              >
                <Maximize className="h-4 w-4 mr-1" /> Fit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPanMode(!isPanMode)}
                className={`h-8 px-2 ${
                  isPanMode ? "bg-blue-100 text-blue-700 border-blue-300" : ""
                }`}
              >
                <Move className="h-4 w-4 mr-1" />{" "}
                {isPanMode ? "Exit Pan" : "Pan"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-grow bg-gray-50 rounded-b-xl overflow-hidden">
        <style jsx global>{`
          .no-text-select {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          .connection-graph-touch-target {
            touch-action: none;
          }
          @keyframes pulse {
            0% {
              opacity: 0.9;
              box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.6),
                0 0 0 1px rgba(239, 68, 68, 0.8);
            }
            25% {
              opacity: 1;
              box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.8),
                0 0 0 1px rgba(239, 68, 68, 0.9);
            }
            40% {
              opacity: 0.85;
              box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5),
                0 0 0 1px rgba(239, 68, 68, 0.7);
            }
            60% {
              opacity: 0.95;
              box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.7),
                0 0 0 2px rgba(239, 68, 68, 0.9);
            }
            85% {
              opacity: 1;
              box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.8),
                0 0 0 2px rgba(239, 68, 68, 1);
            }
            100% {
              opacity: 0.9;
              box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.6),
                0 0 0 1px rgba(239, 68, 68, 0.8);
            }
          }
        `}</style>

        {selectedUsers.length === 1 && primarySelectedUserInfo && (
          <SelectionInfoCard
            selectedUser={primarySelectedUserInfo}
            onClearSelection={() => setSelectedUsers([])}
            isMobile={isMobile}
          />
        )}

        {selectedUsers.length > 1 && (
          <EnhancedMultiSelectCard
            selectedUsers={selectedUserObjects}
            hasExistingConnection={hasExistingConnections}
            onCreateConnections={handleCreateConnections}
            onDeleteConnections={handleDeleteConnections}
            onClearSelection={() => setSelectedUsers([])}
            isMobile={isMobile}
          />
        )}

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox.join(" ")}
          style={{
            background: GRAPH_CONFIG.COLORS.BACKGROUND,
            cursor: isPanMode ? (drag ? "grabbing" : "grab") : "default",
            transition: "cursor 0.2s ease",
          }}
          className={`${
            isPanMode ? "no-text-select connection-graph-touch-target" : ""
          }`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <g style={{ zIndex: GRAPH_CONFIG.LAYER.HUB_SPOKE_LINES }}>
            {layoutData.userPositions.map(({ x, y, user }) => (
              <line
                key={`hub-spoke-${user._id}`}
                x1={layoutData.centerX}
                y1={layoutData.centerY}
                x2={x}
                y2={y}
                stroke={GRAPH_CONFIG.COLORS.HUB_SPOKE_LINE}
                strokeWidth={
                  hoverUser === user._id || selectedUsers.includes(user._id)
                    ? isMobile
                      ? 2
                      : 3
                    : isMobile
                    ? 1.5
                    : 2
                }
                strokeDasharray={isMobile ? "10 6" : "15 8"}
                opacity={
                  (hoverUser &&
                    hoverUser !== user._id &&
                    !selectedUsers.includes(user._id)) ||
                  (selectedUsers.length > 0 &&
                    !selectedUsers.includes(user._id) &&
                    hoverUser !== user._id)
                    ? 0.3
                    : 0.8
                }
                className="transition-all duration-200"
                style={{ pointerEvents: "none" }}
              />
            ))}
          </g>

          <g style={{ zIndex: GRAPH_CONFIG.LAYER.CONNECTION_LINES }}>
            {layoutData.processedConnections.map((conn) => {
              if (!conn) return null;

              const isHighlighted =
                hoverConnection === conn._id ||
                hoverUser === conn.userAPos.user._id ||
                hoverUser === conn.userBPos.user._id ||
                selectedUsers.includes(conn.userAPos.user._id) ||
                selectedUsers.includes(conn.userBPos.user._id);

              return (
                <ConnectionLine
                  key={conn._id}
                  sourceX={conn.userAPos.x}
                  sourceY={conn.userAPos.y}
                  targetX={conn.userBPos.x}
                  targetY={conn.userBPos.y}
                  color={conn.color}
                  isHighlighted={isHighlighted}
                  onMouseEnter={() => setHoverConnection(conn._id)}
                  onMouseLeave={() => setHoverConnection(null)}
                  isMobile={isMobile}
                />
              );
            })}
          </g>

          <g style={{ zIndex: GRAPH_CONFIG.LAYER.CONNECTION_LINES }}>
            {layoutData.circleConnections.map((conn) => {
              const isHighlighted =
                hoverCircle === conn.circleId ||
                hoverUser === conn.userId ||
                selectedUsers.includes(conn.userId);

              return (
                <CircleConnectionLine
                  key={`circle-conn-${conn.circleId}-${conn.userId}`}
                  userX={conn.userPos.x}
                  userY={conn.userPos.y}
                  circleX={conn.circlePos.x}
                  circleY={conn.circlePos.y}
                  color={conn.color}
                  isHighlighted={isHighlighted}
                  isMobile={isMobile}
                />
              );
            })}
          </g>

          <g style={{ zIndex: GRAPH_CONFIG.LAYER.CONNECTION_LABELS }}>
            {layoutData.processedConnections
              .filter((conn) => conn && conn.notes)
              .map((conn) => {
                if (!conn) return null;
                const isHighlighted =
                  hoverConnection === conn._id ||
                  hoverUser === conn.userAPos.user._id ||
                  hoverUser === conn.userBPos.user._id ||
                  selectedUsers.includes(conn.userAPos.user._id) ||
                  selectedUsers.includes(conn.userBPos.user._id);

                return (
                  <ConnectionLabel
                    key={`label-${conn._id}`}
                    x={conn.labelPosition.x}
                    y={conn.labelPosition.y}
                    name={conn.notes || ""}
                    color={conn.color}
                    isHighlighted={isHighlighted}
                    onDelete={
                      onDeleteConnection
                        ? () => onDeleteConnection(conn._id)
                        : undefined
                    }
                    isMobile={isMobile}
                  />
                );
              })}
          </g>

          <g style={{ zIndex: GRAPH_CONFIG.LAYER.CONNECTION_LABELS }}>
            {layoutData.circleNodes.map((circle) => (
              <CircleNode
                key={circle.id}
                x={circle.position.x}
                y={circle.position.y}
                color={circle.color}
                userCount={circle.userCount}
                isHighlighted={
                  hoverCircle === circle.id ||
                  circle.users.some(
                    (u) => hoverUser === u._id || selectedUsers.includes(u._id)
                  )
                }
                isMobile={isMobile}
              />
            ))}
          </g>

          <g style={{ zIndex: GRAPH_CONFIG.LAYER.USER_NODES }}>
            <HubNode
              x={layoutData.centerX}
              y={layoutData.centerY}
              avatar={host.profileImage}
              name={host.username}
              email={host.email}
              isMobile={isMobile}
            />
          </g>

          <g style={{ zIndex: GRAPH_CONFIG.LAYER.USER_NODES }}>
            {layoutData.userPositions.map(
              ({ x, y, user, directConnections }) => {
                const userCircleId = findCircleForUser(user._id);
                const circleColor = userCircleId
                  ? layoutData.circleNodes.find((c) => c.id === userCircleId)
                      ?.color
                  : undefined;

                const userMicroCircles = getUserMicroCircles(user._id);

                const isConnectedToSelected =
                  selectedUsers.length === 1 &&
                  directConnections.some(
                    (connId) => connId === selectedUsers[0]
                  );

                const isSearchResult = searchResults.includes(user._id);

                return (
                  <SpokeNode
                    key={user._id}
                    x={x}
                    y={y}
                    avatar={user.profileImage}
                    name={user.username}
                    email={user.email}
                    highlight={Boolean(
                      hoverUser === user._id ||
                        isConnectedToSelected ||
                        (userCircleId && hoverCircle === userCircleId)
                    )}
                    isSelected={selectedUsers.includes(user._id)}
                    isSearchResult={isSearchResult}
                    connectionCount={directConnections.length}
                    inCircle={!!userCircleId}
                    circleColor={circleColor}
                    microCircles={
                      userMicroCircles.length > 0 ? userMicroCircles : undefined
                    }
                    onClick={() => handleSpokeClick(user._id)}
                    onMouseEnter={() => {
                      setHoverUser(user._id);
                      if (userCircleId) {
                        setHoverCircle(userCircleId);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoverUser(null);
                      setHoverCircle(null);
                    }}
                    isMobile={isMobile}
                  />
                );
              }
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

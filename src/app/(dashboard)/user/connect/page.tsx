"use client";

import React from "react";
import { trpc } from "../../../../../utils/providers/TrpcProviders";
import ConversationComponent from "@/app/_components/conversation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect with Friends",
  description: "Chat and connect with your friends",
};

export default function HostConnectPage() {
  const currentUser = trpc.auth.getCurrentUser.useQuery({ fulluser: true });
  const isHost = currentUser.data?.role === "host";

  return (
    <main className="min-h-screen bg-blue-50 py-8 px-2">
      <ConversationComponent currentUser={currentUser} isHost={isHost} />
    </main>
  );
}

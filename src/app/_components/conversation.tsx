"use client";

import React, { useState, useRef } from "react";
import {
  Paperclip,
  Send,
  X,
  FileText,
  User,
  Search,
  UserPlus,
  MessageCircle,
  PlusCircle,
  Video,
  Users,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "../../../utils/providers/TrpcProviders";

const MAX_MESSAGE_LENGTH = 5000;

export default function ConversationComponent({
  currentUser,
  isHost,
}: {
  currentUser: any;
  isHost: boolean;
}) {
  const user = currentUser?.data?.user || currentUser?.data || {};
  const userId = user?._id || currentUser?.data?._id;

  const connectionsQuery = !isHost
    ? trpc.connection.getUserConnections.useQuery()
    : trpc.user.getAllUsers.useQuery();
  const microCirclesQuery = trpc.microCircle.getMicroCircles.useQuery();
  const conversationsQuery = trpc.conversation.getMyConversations.useQuery();
  const sendMessage = trpc.conversation.sendMessage.useMutation();

  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"user" | "microCircle">(
    "user"
  );
  const [content, setContent] = useState("");
  const [isContentTooLong, setIsContentTooLong] = useState(false);
  const [attachments, setAttachments] = useState<
    { fileData: string; type: "image" | "video" | "file" }[]
  >([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);

  const [showSendModal, setShowSendModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  let connections: any[] = [];
  if (Array.isArray(connectionsQuery.data)) {
    connections = connectionsQuery.data;
  } else if (
    connectionsQuery.data?.users &&
    Array.isArray(connectionsQuery.data.users)
  ) {
    connections = connectionsQuery.data.users;
  }

  const microCircles = microCirclesQuery.data?.circles || [];
  const conversations = conversationsQuery.data || [];

  const dropdownUsers = [
    ...connections,
    ...microCircles.flatMap((circle: any) => circle.members || []),
  ]
    .filter((u: any) => u._id !== userId)
    .reduce((acc: any[], user: any) => {
      if (!acc.some((u) => u._id === user._id)) acc.push(user);
      return acc;
    }, []);

  const allUsers = dropdownUsers;

  const filteredUsers = allUsers.filter((user) =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelfConversation = (conversation: any): boolean => {
    if (
      !conversation ||
      !conversation.participants ||
      conversation.participants.length < 2
    ) {
      return false;
    }

    return (
      conversation.participants.length === 2 &&
      conversation.participants[0]._id === conversation.participants[1]._id
    );
  };

  function getOtherParticipant(convo: any): any | null {
    if (!convo || !convo.participants) return null;

    if (isSelfConversation(convo)) {
      return convo.participants[0];
    }

    return convo.participants.find((p: any) => p._id !== userId) || null;
  }

  const closeSendModal = () => {
    setShowSendModal(false);
    setSelectedUser("");
    setContent("");
    setAttachments([]);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setSending(true);
    const promises: Promise<void>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      promises.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            let type: "image" | "video" | "file" = "file";
            if (file.type.startsWith("image")) type = "image";
            else if (file.type.startsWith("video")) type = "video";
            setAttachments((prev) => [
              ...prev,
              { fileData: reader.result as string, type },
            ]);
            resolve();
          };
          reader.readAsDataURL(file);
        })
      );
    }
    Promise.all(promises).then(() => setSending(false));
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);

    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(
        `Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
      );
      setSending(false);
      return;
    }

    try {
      await sendMessage.mutateAsync({
        to: selectedUser,
        toType: selectedType,
        content,
        attachments,
      });
      setContent("");
      setAttachments([]);
      setSelectedUser("");
      closeSendModal();
      conversationsQuery.refetch();
    } catch (err: any) {
      setError(err.message || "Failed to send");
    }
    setSending(false);
  };

  const formatDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return `Today at ${messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } else {
      return messageDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= MAX_MESSAGE_LENGTH) {
      setContent(newContent);
      setIsContentTooLong(false);
    } else {
      setIsContentTooLong(true);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-800">
            <MessageCircle className="inline-block mr-2 h-8 w-8" />
            Messages
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUsersModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg text-blue-600 hover:bg-blue-50 shadow-sm transition-all"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">All Users</span>
            </button>
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">New Message</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {conversations.length === 0 ? (
            <div className="bg-white rounded-xl border border-blue-100 shadow-lg p-10 text-center">
              <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-medium text-blue-900 mb-2">
                No Messages Yet
              </h3>
              <p className="text-blue-600 mb-6">
                Start a conversation by sending a message to someone.
              </p>
              <button
                onClick={() => setShowSendModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Send First Message
              </button>
            </div>
          ) : (
            <>
              {conversations
                .sort(
                  (a: any, b: any) =>
                    new Date(
                      b.messages[b.messages.length - 1]?.createdAt || ""
                    ).getTime() -
                    new Date(
                      a.messages[a.messages.length - 1]?.createdAt || ""
                    ).getTime()
                )
                .map((convo: any) => {
                  const other = getOtherParticipant(convo);
                  const lastMsg = convo.messages[convo.messages.length - 1];
                  const lastMsgTime = formatDate(lastMsg?.createdAt);

                  const selfConvo = isSelfConversation(convo);

                  const isFromMe = lastMsg?.sender?._id === userId;

                  let messageStatus = "Received";
                  if (selfConvo) {
                    messageStatus = "Note to Self";
                  } else if (isFromMe) {
                    messageStatus = "Sent";
                  }

                  return (
                    <motion.div
                      key={convo._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl border border-blue-100 shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() =>
                        setSelectedConversation(convo._id as string)
                      }
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {other?.profileImage ? (
                              <img
                                src={other.profileImage}
                                alt={other.username}
                                className="w-12 h-12 rounded-full border-2 border-blue-200 object-cover shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl border-2 border-blue-200 shadow-sm">
                                {other?.username?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-lg text-blue-900">
                                {selfConvo
                                  ? "Note to Self"
                                  : other?.username || "Unknown"}
                              </h3>
                              <div className="flex items-center text-blue-500 text-sm">
                                <span>{lastMsgTime}</span>
                              </div>
                            </div>
                          </div>
                          <div
                            className={clsx(
                              "px-3 py-1 rounded-full text-xs font-medium",
                              selfConvo
                                ? "bg-purple-100 text-purple-700"
                                : isFromMe
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            )}
                          >
                            {messageStatus}
                          </div>
                        </div>

                        <div
                          className={clsx(
                            "px-5 py-4 rounded-lg mb-3",
                            selfConvo
                              ? "bg-purple-50 border border-purple-100"
                              : isFromMe
                              ? "bg-blue-50 border border-blue-100"
                              : "bg-green-50 border border-green-100"
                          )}
                        >
                          {lastMsg?.content ? (
                            <p className="text-gray-700 break-words line-clamp-3">
                              {lastMsg.content}
                            </p>
                          ) : lastMsg?.attachments?.length ? (
                            <p className="text-gray-600 italic">
                              <Paperclip className="inline-block h-4 w-4 mr-1" />
                              {lastMsg.attachments.length} attachment
                              {lastMsg.attachments.length > 1 ? "s" : ""}
                            </p>
                          ) : (
                            <p className="text-gray-500 italic">
                              No message content
                            </p>
                          )}
                        </div>

                        {lastMsg?.attachments &&
                          lastMsg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {lastMsg.attachments
                                .slice(0, 3)
                                .map((att: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className={clsx(
                                      "rounded-lg border border-blue-100 shadow-sm",
                                      att.type === "image"
                                        ? "w-20 h-20"
                                        : "w-16 h-12"
                                    )}
                                  >
                                    {att.type === "image" ? (
                                      <img
                                        src={att.url}
                                        alt="attachment"
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                    ) : att.type === "video" ? (
                                      <div className="w-full h-full bg-blue-50 flex items-center justify-center rounded-lg">
                                        <Video className="h-6 w-6 text-blue-500" />
                                      </div>
                                    ) : (
                                      <div className="w-full h-full bg-blue-50 flex items-center justify-center rounded-lg">
                                        <FileText className="h-6 w-6 text-blue-500" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              {lastMsg.attachments.length > 3 && (
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-medium">
                                  +{lastMsg.attachments.length - 3}
                                </div>
                              )}
                            </div>
                          )}

                        <div className="mt-4 flex justify-end">
                          <button
                            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConversation(convo._id as string);
                            }}
                          >
                            View conversation
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 md:hidden z-10">
        <button
          onClick={() => setShowSendModal(true)}
          className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Send className="h-6 w-6" />
        </button>
      </div>

      <AnimatePresence>
        {showSendModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-blue-200"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-blue-800">
                    New Message
                  </h3>
                  <button
                    onClick={closeSendModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-5">
                  <div className="flex gap-3 mb-4">
                    <button
                      className={clsx(
                        "flex-1 py-2 rounded-lg font-medium transition-colors",
                        selectedType === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      )}
                      onClick={() => setSelectedType("user")}
                    >
                      <User className="inline-block h-4 w-4 mr-1" />
                      User
                    </button>
                    <button
                      className={clsx(
                        "flex-1 py-2 rounded-lg font-medium transition-colors",
                        selectedType === "microCircle"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      )}
                      onClick={() => setSelectedType("microCircle")}
                    >
                      <Users className="inline-block h-4 w-4 mr-1" />
                      Circle
                    </button>
                  </div>

                  {selectedType === "user" ? (
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                    >
                      <option value="">Select recipient...</option>
                      {dropdownUsers.map((user: any) => (
                        <option key={user._id} value={user._id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                    >
                      <option value="">Select circle...</option>
                      {microCircles.map((circle: any) => (
                        <option key={circle._id} value={circle._id}>
                          {circle.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="mb-5">
                  <textarea
                    className={clsx(
                      "w-full border rounded-lg px-4 py-3 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:border-blue-500",
                      isContentTooLong
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    )}
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Write your message..."
                    rows={4}
                    maxLength={MAX_MESSAGE_LENGTH}
                  />
                  <div
                    className={clsx(
                      "text-xs mt-1 flex justify-end",
                      content.length > MAX_MESSAGE_LENGTH * 0.9
                        ? "text-red-500"
                        : "text-gray-500"
                    )}
                  >
                    {content.length}/{MAX_MESSAGE_LENGTH} characters
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex gap-2 flex-wrap mb-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative group">
                        <div
                          className={clsx(
                            "rounded-lg border border-blue-200 bg-white shadow-sm flex items-center justify-center overflow-hidden",
                            att.type === "image" ? "w-20 h-20" : "w-16 h-16"
                          )}
                        >
                          {att.type === "image" ? (
                            <img
                              src={att.fileData}
                              alt="attachment"
                              className="w-full h-full object-cover"
                            />
                          ) : att.type === "video" ? (
                            <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                              <Video className="h-8 w-8 text-blue-500" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-blue-500" />
                            </div>
                          )}
                        </div>
                        <button
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            setAttachments((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      className="w-20 h-20 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center text-blue-400 hover:text-blue-600 hover:border-blue-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <PlusCircle className="w-8 h-8 mb-1" />
                      <span className="text-xs">Add File</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                    {error}
                  </div>
                )}

                <button
                  className={clsx(
                    "w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center",
                    (sending ||
                      !selectedUser ||
                      (!content && attachments.length === 0)) &&
                      "opacity-60 cursor-not-allowed"
                  )}
                  disabled={
                    !selectedUser ||
                    (!content && attachments.length === 0) ||
                    sending
                  }
                  onClick={handleSend}
                >
                  {sending ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUsersModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-blue-200 max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-blue-800">All Users</h3>
                  <button
                    onClick={() => setShowUsersModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 border-b border-gray-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUsers.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map((user: any) => {
                      const convo = conversations.find((c: any) =>
                        c.participants.some((p: any) => p._id === user._id)
                      );

                      return (
                        <div
                          key={user._id}
                          className="border border-blue-100 rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            if (convo) {
                              setSelectedConversation(convo._id as string);
                              setShowUsersModal(false);
                            } else {
                              setShowUsersModal(false);
                              setShowSendModal(true);
                              setSelectedType("user");
                              setSelectedUser(user._id as string);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.username}
                                className="w-12 h-12 rounded-full border border-blue-200 object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl border border-blue-200">
                                {user.username?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-blue-900">
                                {user.username}
                              </h3>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-blue-500">
                                  {convo
                                    ? "Has conversation"
                                    : "No messages yet"}
                                </span>
                                <button className="text-blue-600 hover:text-blue-800">
                                  {convo ? (
                                    <MessageCircle className="h-4 w-4" />
                                  ) : (
                                    <UserPlus className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedConversation && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-blue-200 max-h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="mr-3 text-blue-500 hover:text-blue-700"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {selectedConversation.startsWith("no-msg-") ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                      ?
                    </div>
                    <h3 className="text-lg font-bold text-blue-800">
                      New Conversation
                    </h3>
                  </div>
                ) : (
                  (() => {
                    const convo = conversations.find(
                      (c: any) => c._id === selectedConversation
                    );
                    if (!convo) return null;

                    const selfConvo = isSelfConversation(convo);
                    const other = getOtherParticipant(convo);

                    return (
                      <div className="flex items-center gap-3">
                        {other?.profileImage ? (
                          <img
                            src={other.profileImage}
                            alt={other.username}
                            className="w-10 h-10 rounded-full border border-blue-200 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                            {other?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <h3 className="text-lg font-bold text-blue-800">
                          {selfConvo
                            ? "Note to Self"
                            : other?.username || "Unknown"}
                        </h3>
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {selectedConversation.startsWith("no-msg-") ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10">
                    <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-medium text-blue-900 mb-2">
                      No messages yet
                    </h3>
                    <p className="text-blue-600 mb-6">
                      Start a conversation by sending a message.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedConversation(null);
                        setShowSendModal(true);
                        setSelectedType("user");
                        setSelectedUser(
                          selectedConversation.replace("no-msg-", "")
                        );
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Conversation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const convo = conversations.find(
                        (c: any) => c._id === selectedConversation
                      );
                      const isSelfConversation =
                        convo &&
                        convo.participants.length === 2 &&
                        convo.participants[0]._id === convo.participants[1]._id;

                      return conversations
                        .find((c: any) => c._id === selectedConversation)
                        ?.messages.map((msg: any, idx: number) => (
                          <div
                            key={`${msg._id || idx}`}
                            className={clsx(
                              "max-w-[80%]",
                              msg.sender._id === userId ? "ml-auto" : "mr-auto"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {msg.sender.profileImage ? (
                                <img
                                  src={msg.sender.profileImage}
                                  alt={msg.sender.username}
                                  className="w-6 h-6 rounded-full border border-blue-200 object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                  {msg.sender.username?.[0]?.toUpperCase() ||
                                    "?"}
                                </div>
                              )}
                              <span className="font-medium text-sm text-blue-800">
                                {isSelfConversation
                                  ? "You"
                                  : msg.sender._id === userId
                                  ? "You"
                                  : msg.sender.username}
                              </span>
                              <span className="text-xs text-blue-400">
                                {formatDate(msg.createdAt)}
                              </span>
                            </div>

                            <div
                              className={clsx(
                                "rounded-xl p-4",
                                isSelfConversation
                                  ? "bg-purple-50 border border-purple-200 text-purple-900"
                                  : msg.sender._id === userId
                                  ? "bg-blue-100 text-blue-900"
                                  : "bg-white border border-blue-100 text-gray-700"
                              )}
                            >
                              {msg.content && (
                                <div className="mb-2 whitespace-pre-wrap break-words overflow-hidden">
                                  {msg.content}
                                </div>
                              )}

                              {msg.attachments &&
                                msg.attachments.length > 0 && (
                                  <div className="mt-2 grid grid-cols-3 gap-2">
                                    {msg.attachments.map(
                                      (att: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="rounded-lg overflow-hidden border border-blue-200 aspect-square bg-white"
                                        >
                                          {att.type === "image" ? (
                                            <a
                                              href={att.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block w-full h-full"
                                            >
                                              <img
                                                src={att.url}
                                                alt="attachment"
                                                className="w-full h-full object-cover"
                                              />
                                            </a>
                                          ) : att.type === "video" ? (
                                            <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                                              <a
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-full flex items-center justify-center"
                                              >
                                                <Video className="h-8 w-8 text-blue-500" />
                                              </a>
                                            </div>
                                          ) : (
                                            <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                                              <a
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-full flex items-center justify-center"
                                              >
                                                <FileText className="h-8 w-8 text-blue-500" />
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const convo = conversations.find(
                        (c: any) => c._id === selectedConversation
                      );
                      if (convo) {
                        const other = getOtherParticipant(convo);
                        setSelectedConversation(null);
                        setShowSendModal(true);
                        setSelectedType("user");
                        setSelectedUser(other?._id as string);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Reply
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

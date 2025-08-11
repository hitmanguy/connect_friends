"use client";

import {
  Calendar,
  Smile,
  Frown,
  Meh,
  Music,
  User,
  Lock,
  Share2,
  PlayCircle,
  Users,
  Check,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { Spotify } from "react-spotify-embed";
import { motion } from "framer-motion";

const getValidUrl = (urlString: string): string | null => {
  try {
    new URL(urlString);
    return urlString;
  } catch (e) {
    try {
      const urlWithProtocol = `https://${urlString}`;
      new URL(urlWithProtocol);
      return urlWithProtocol;
    } catch (e) {
      return null;
    }
  }
};

const getPlatformDetails = (platform: string | null | undefined) => {
  switch (platform) {
    case "spotify":
      return {
        color: "#1DB954",
        icon: "🎧",
        name: "Spotify",
      };
    case "youtube":
      return {
        color: "#FF0000",
        icon: "▶️",
        name: "YouTube",
      };
    case "youtubeMusic":
      return {
        color: "#FF0000",
        icon: "🎵",
        name: "YouTube Music",
      };
    case "appleMusic":
      return {
        color: "#FB233B",
        icon: "🎵",
        name: "Apple Music",
      };
    default:
      return {
        color: "#0ea5e9",
        icon: "🎵",
        name: platform || "Music",
      };
  }
};

type MoodEntryType = {
  _id?: string;
  date?: any;
  mood: number;
  activities: string[];
  notes?: string | null;
  privateNotes?: string | null;
  media: {
    url: string;
    type: "image" | "video";
    _id?: string;
  }[];
  music?: {
    title?: string | null;
    url?: string | null;
    platform?:
      | "spotify"
      | "youtube"
      | "youtubeMusic"
      | "appleMusic"
      | "other"
      | null;
  } | null;
  sharing: {
    isPrivate?: boolean;
    sharedWith?: Array<{
      _id?: string;
      username?: string;
      email?: string;
      profileImage?: string;
    }>;
    customVersions?: Array<{
      userId?: string;
      user?: {
        username?: string;
        profileImage?: string;
      };
      notes?: string;
      mediaUrls?: string[];
      media?: {
        url: string;
        type: "image" | "video";
      }[];
      music?: {
        title?: string;
        url?: string;
        platform?: string;
      };
    }>;
    sharedWithCircles?: Array<{
      circleId?: string;
      customNotes?: string;
      mediaUrls?: string[];
      members: Array<{
        _id?: string;
        username?: string;
        email?: string;
        profileImage?: string;
      }>;
    }>;
  };
  isReceived?: boolean;
  customVersion?: {
    notes?: string;
    mediaUrls?: string[];
  };
};

interface ViewMoodEntryProps {
  moodEntry?: MoodEntryType | null;
  isLoading: boolean;
}

export default function ViewMoodEntry({
  moodEntry,
  isLoading,
  isEmbedded = false,
}: ViewMoodEntryProps & { isEmbedded?: boolean }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const isToday = (dateToCheck: any): boolean => {
    if (!dateToCheck) return false;

    const today = new Date();
    const entryDate = new Date(dateToCheck);

    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    );
  };

  const formatEntryDate = (dateToFormat: any): string => {
    if (!dateToFormat) return "";

    try {
      const entryDate = new Date(dateToFormat);
      return entryDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateToFormat.toString();
    }
  };

  if (isEmbedded) {
    return (
      <div className="relative rounded-xl overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50/80 to-sky-50/80 rounded-xl"></div>

        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-blue-900">
              {isToday(moodEntry?.date) ? "Today's Mood" : "Mood Entry"}
            </h1>
            <div className="bg-blue-50 rounded-lg px-3 py-1 text-blue-600 text-sm font-medium">
              <Calendar className="inline-block mr-1 h-4 w-4" />
              {moodEntry?.date
                ? formatEntryDate(moodEntry.date)
                : new Date().toLocaleDateString()}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-10 w-10 border-4 border-blue-200 rounded-full border-t-blue-600 mb-3"></div>
              <p className="text-blue-700 font-medium">
                Loading your mood entry...
              </p>
            </div>
          ) : moodEntry ? (
            <motion.div
              className="rounded-xl space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                className="bg-white/70 backdrop-blur-sm p-5 rounded-xl border border-blue-50 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 bg-gradient-to-b from-blue-50 to-white p-5 rounded-full shadow-md">
                      {moodEntry.mood <= 1 && (
                        <Frown className="w-14 h-14 text-red-500" />
                      )}
                      {moodEntry.mood === 2 && (
                        <Frown className="w-14 h-14 text-orange-500" />
                      )}
                      {moodEntry.mood === 3 && (
                        <Meh className="w-14 h-14 text-yellow-500" />
                      )}
                      {moodEntry.mood == 4 && (
                        <Smile className="w-14 h-14 text-green-500" />
                      )}
                      {moodEntry.mood >= 5 && (
                        <Smile className="w-14 h-14 text-green-500" />
                      )}
                    </div>
                    <p className="text-center font-medium text-blue-800">
                      {moodEntry.mood <= 1 && "Worse than bad"}
                      {moodEntry.mood === 2 && "Not so great"}
                      {moodEntry.mood === 3 && "Okay"}
                      {moodEntry.mood === 4 && "Feeling good"}
                      {moodEntry.mood >= 5 && "Feeling awesome"}
                    </p>
                  </div>

                  {(moodEntry.activities?.length ?? 0) > 0 && (
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                        <span className="bg-blue-100 p-1.5 rounded-md mr-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </span>
                        Activities
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(moodEntry.activities ?? []).map(
                          (activity: string, i: number) => (
                            <span
                              key={i}
                              className="bg-blue-100/70 text-blue-800 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm"
                            >
                              {activity}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
              {moodEntry.notes && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-blue-100 shadow-sm"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm">
                      <span className="bg-blue-100 p-1 rounded-md mr-1 inline-block">
                        <MessageCircle className="h-3 w-3 text-blue-600" />
                      </span>
                      Notes
                    </h3>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-gray-700 text-sm break-words whitespace-pre-wrap">
                        {moodEntry.notes}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {moodEntry.privateNotes && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-indigo-100 shadow-sm"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-indigo-800 mb-2 text-sm">
                      <span className="bg-indigo-100 p-1 rounded-md mr-1 inline-block">
                        <Lock className="h-3 w-3 text-indigo-600" />
                      </span>
                      Private Notes
                    </h3>
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <p className="text-gray-700 text-sm break-words whitespace-pre-wrap">
                        {moodEntry.privateNotes}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {(moodEntry.media?.length ?? 0) > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-blue-100 shadow-sm"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm">
                      <span className="bg-blue-100 p-1 rounded-md mr-1 inline-block">
                        <PlayCircle className="h-3 w-3 text-blue-600" />
                      </span>
                      Media
                    </h3>

                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-2">
                        {moodEntry.media?.map(
                          (
                            media: { url: string; type: "image" | "video" },
                            i: number
                          ) => (
                            <div
                              key={i}
                              className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden border border-blue-100"
                            >
                              {media.type === "image" ? (
                                <img
                                  src={media.url}
                                  alt="Media"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                                  <PlayCircle className="h-8 w-8 text-blue-400" />
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {moodEntry.music?.url && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm">
                      <span className="bg-blue-100 p-1 rounded-md mr-1 inline-block">
                        <Music className="h-3 w-3 text-blue-600" />
                      </span>
                      Music
                    </h3>

                    {moodEntry.music?.url && (
                      <div className="bg-black/5 border-t border-white/10 max-h-28 overflow-hidden">
                        <MusicEmbed
                          platform={moodEntry.music?.platform}
                          url={moodEntry.music?.url}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              {!moodEntry.isReceived && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white/70 backdrop-blur-sm p-5 rounded-xl border border-blue-50 shadow-sm"
                >
                  <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                    <span className="bg-blue-100 p-1.5 rounded-md mr-2">
                      <Share2 className="h-4 w-4 text-blue-600" />
                    </span>
                    Sharing
                  </h3>
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    {moodEntry.sharing?.isPrivate ? (
                      <div className="flex items-center text-blue-700 p-2">
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 mr-2">
                          <Lock className="h-5 w-5 text-blue-600" />
                        </div>
                        <span>This entry is private</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(moodEntry.sharing?.sharedWith?.length ?? 0) > 0 && (
                          <div>
                            <div className="flex items-center text-blue-700 mb-2">
                              <Share2 className="h-4 w-4 mr-2" />
                              <span>
                                Shared with{" "}
                                {moodEntry.sharing?.sharedWith?.length ?? 0}{" "}
                                connection
                                {(moodEntry.sharing?.sharedWith?.length ?? 0) >
                                1
                                  ? "s"
                                  : ""}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-6">
                              {(moodEntry.sharing?.sharedWith ?? []).map(
                                (
                                  user: {
                                    username?: string;
                                    profileImage?: string;
                                  },
                                  idx: number
                                ) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
                                  >
                                    {user.profileImage ? (
                                      <img
                                        src={user.profileImage}
                                        alt={user.username || "User"}
                                        className="w-6 h-6 rounded-full object-cover border border-blue-200"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                        {user.username?.[0]?.toUpperCase() ||
                                          "?"}
                                      </div>
                                    )}
                                    <span className="text-blue-900 font-medium text-xs">
                                      {user.username || "User"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {(moodEntry.sharing?.sharedWithCircles?.length ?? 0) >
                          0 && (
                          <div>
                            <div className="flex items-center text-blue-700 mb-2">
                              <Users className="h-4 w-4 mr-2" />
                              <span>
                                Shared with{" "}
                                {moodEntry.sharing?.sharedWithCircles?.length ??
                                  0}{" "}
                                circle
                                {(moodEntry.sharing?.sharedWithCircles
                                  ?.length ?? 0) > 1
                                  ? "s"
                                  : ""}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-6">
                              {moodEntry.sharing?.sharedWithCircles?.flatMap(
                                (
                                  circle: {
                                    members: {
                                      username?: string;
                                      profileImage?: string;
                                    }[];
                                  },
                                  cidx: number
                                ) =>
                                  circle.members.map((member, midx) => (
                                    <div
                                      key={`${cidx}-${midx}`}
                                      className="flex items-center gap-2 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100"
                                    >
                                      {member.profileImage ? (
                                        <img
                                          src={member.profileImage}
                                          alt={member.username || "Member"}
                                          className="w-6 h-6 rounded-full object-cover border border-blue-200"
                                        />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                          {member.username?.[0]?.toUpperCase() ||
                                            "?"}
                                        </div>
                                      )}
                                      <span className="text-blue-900 font-medium text-xs">
                                        {member.username || "Member"}
                                      </span>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        )}

                        {Array.isArray(moodEntry.sharing?.customVersions) &&
                          moodEntry.sharing.customVersions.length > 0 && (
                            <motion.div
                              variants={itemVariants}
                              className="mt-3 pt-3 border-t border-blue-100 sm:mt-4 sm:pt-4"
                            >
                              <h4 className="font-medium text-blue-800 mb-2 sm:mb-3 flex items-center text-sm">
                                <span className="bg-purple-100 p-1 sm:p-1.5 rounded-md mr-1.5 sm:mr-2 inline-flex items-center justify-center">
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                                </span>
                                Custom Shared Versions
                              </h4>
                              <div className="space-y-3 sm:space-y-4">
                                {moodEntry.sharing.customVersions.map(
                                  (customVersion, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 overflow-hidden"
                                    >
                                      <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm p-2 sm:p-3 border-b border-purple-100">
                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                          {customVersion.user?.profileImage ? (
                                            <img
                                              src={
                                                customVersion.user.profileImage
                                              }
                                              alt=""
                                              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-purple-200 flex-shrink-0"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold border border-purple-200 flex-shrink-0">
                                              {customVersion.user?.username?.[0]?.toUpperCase() ||
                                                "?"}
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <span className="font-medium text-purple-900 text-xs sm:text-sm truncate block max-w-[120px] sm:max-w-none">
                                              {customVersion.user?.username ||
                                                "User"}
                                            </span>
                                            <div className="text-xs text-purple-600 hidden sm:block">
                                              Custom version
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-purple-100 text-purple-700 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-xs flex items-center">
                                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                          <span className="hidden xs:inline">
                                            Custom
                                          </span>
                                        </div>
                                      </div>

                                      {customVersion.notes && (
                                        <div className="p-2 sm:p-4">
                                          <div className="text-xs font-medium text-purple-700 mb-1 sm:mb-2 uppercase tracking-wider">
                                            Custom Note
                                          </div>
                                          <div className="bg-white p-2 sm:p-4 rounded-lg border border-purple-100">
                                            <p className="text-gray-700 text-xs sm:text-sm break-words whitespace-pre-wrap overflow-hidden">
                                              {customVersion.notes}
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {(Array.isArray(
                                        customVersion.mediaUrls
                                      ) &&
                                        customVersion.mediaUrls.length > 0) ||
                                      (Array.isArray(customVersion.media) &&
                                        customVersion.media.length > 0) ? (
                                        <div className="px-2 pb-2 pt-0 sm:p-4 sm:pt-0">
                                          <div className="text-xs font-medium text-purple-700 mt-2 mb-1 sm:mt-4 sm:mb-2 uppercase tracking-wider">
                                            Custom Media
                                          </div>

                                          <div className="overflow-x-auto pb-1 sm:pb-2 -mx-2 px-2">
                                            <div className="flex gap-1.5 sm:gap-2">
                                              {customVersion.mediaUrls?.map(
                                                (url, mediaIdx) => (
                                                  <div
                                                    key={`url-${mediaIdx}`}
                                                    className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-purple-100"
                                                  >
                                                    {url.includes("video") ? (
                                                      <div className="w-full h-full bg-purple-50 flex items-center justify-center">
                                                        <PlayCircle className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                                                      </div>
                                                    ) : (
                                                      <img
                                                        src={url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                      />
                                                    )}
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ) : null}

                                      {customVersion.music?.title && (
                                        <div className="p-2 pt-0 sm:p-4 sm:pt-0">
                                          <div className="text-xs font-medium text-purple-700 mt-2 mb-1 sm:mt-4 sm:mb-2 uppercase tracking-wider">
                                            Custom Music
                                          </div>
                                          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg overflow-hidden">
                                            <div className="p-2 sm:p-3 relative overflow-hidden">
                                              <div className="relative z-10 flex items-center">
                                                <div className="bg-white/20 backdrop-blur-md p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                                                  <div className="text-lg sm:text-xl">
                                                    {
                                                      getPlatformDetails(
                                                        customVersion.music
                                                          .platform
                                                      ).icon
                                                    }
                                                  </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <div className="text-2xs sm:text-xs font-medium text-purple-100 mb-0.5">
                                                    CUSTOM TRACK
                                                  </div>
                                                  <h3 className="text-xs sm:text-sm font-bold mb-0.5 truncate max-w-full">
                                                    {customVersion.music.title}
                                                  </h3>
                                                  {customVersion.music.url && (
                                                    <a
                                                      href={
                                                        customVersion.music.url
                                                      }
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-2xs sm:text-xs flex items-center text-purple-100 hover:text-white"
                                                    >
                                                      <span className="truncate">
                                                        Listen
                                                      </span>
                                                      <ExternalLink className="h-2 w-2 sm:h-2.5 sm:w-2.5 ml-1 flex-shrink-0" />
                                                    </a>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </motion.div>
                          )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <div className="bg-blue-50 rounded-xl p-8 text-center">
              <p className="text-blue-800 font-medium">
                Could not load mood entry.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 bg-white border-b border-blue-100 sticky top-0 z-10">
        <h1 className="text-lg sm:text-xl font-bold text-blue-900 truncate max-w-[200px]">
          {isToday(moodEntry?.date) ? "Today's Mood" : "Mood Entry"}
        </h1>

        <div className="flex items-center gap-2">
          <div className="bg-blue-50 rounded-lg px-3 py-1 text-blue-600 text-sm font-medium">
            <Calendar className="inline-block mr-1 h-4 w-4" />
            <span>
              {moodEntry?.date
                ? formatEntryDate(moodEntry.date)
                : formatEntryDate(new Date())}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-10 w-10 border-4 border-blue-200 rounded-full border-t-blue-600 mb-3"></div>
              <p className="text-blue-700 font-medium">
                Loading your mood entry...
              </p>
            </div>
          ) : moodEntry ? (
            <motion.div
              className="rounded-xl space-y-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-blue-50 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 bg-gradient-to-b from-blue-50 to-white p-5 rounded-full shadow-md">
                      {moodEntry.mood <= 2 && (
                        <Frown className="w-14 h-14 text-orange-500" />
                      )}
                      {moodEntry.mood === 3 && (
                        <Meh className="w-14 h-14 text-yellow-500" />
                      )}
                      {moodEntry.mood >= 4 && (
                        <Smile className="w-14 h-14 text-green-500" />
                      )}
                    </div>
                    <p className="text-center font-medium text-blue-800">
                      {moodEntry.mood <= 2 && "Not so great"}
                      {moodEntry.mood === 3 && "Okay"}
                      {moodEntry.mood >= 4 && "Feeling good"}
                    </p>
                  </div>

                  {(moodEntry.activities?.length ?? 0) > 0 && (
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                        <span className="bg-blue-100 p-1.5 rounded-md mr-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </span>
                        Activities
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(moodEntry.activities ?? []).map(
                          (activity: string, i: number) => (
                            <span
                              key={i}
                              className="bg-blue-100/70 text-blue-800 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm"
                            >
                              {activity}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {moodEntry.notes && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-blue-100 shadow-sm"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm">
                      <span className="bg-blue-100 p-1 rounded-md mr-1 inline-block">
                        <MessageCircle className="h-3 w-3 text-blue-600" />
                      </span>
                      Notes
                    </h3>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-gray-700 text-sm break-words whitespace-pre-wrap">
                        {moodEntry.notes}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {moodEntry.privateNotes && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-indigo-100 shadow-sm"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-indigo-800 mb-2 text-sm">
                      <span className="bg-indigo-100 p-1 rounded-md mr-1 inline-block">
                        <Lock className="h-3 w-3 text-indigo-600" />
                      </span>
                      Private Notes
                    </h3>
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <p className="text-gray-700 text-sm break-words whitespace-pre-wrap">
                        {moodEntry.privateNotes}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {(moodEntry.media?.length ?? 0) > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-blue-100 shadow-sm"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm">
                      <span className="bg-blue-100 p-1 rounded-md mr-1 inline-block">
                        <PlayCircle className="h-3 w-3 text-blue-600" />
                      </span>
                      Media
                    </h3>

                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-2">
                        {moodEntry.media?.map(
                          (
                            media: { url: string; type: "image" | "video" },
                            i: number
                          ) => (
                            <div
                              key={i}
                              className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden border border-blue-100"
                            >
                              {media.type === "image" ? (
                                <img
                                  src={media.url}
                                  alt="Media"
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                                  <PlayCircle className="h-8 w-8 text-blue-400" />
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {moodEntry.music?.title && (
                <motion.div
                  variants={itemVariants}
                  className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <h3 className="font-medium text-blue-800 mb-2 text-sm">
                      <span className="bg-blue-100 p-1 rounded-md mr-1 inline-block">
                        <Music className="h-3 w-3 text-blue-600" />
                      </span>
                      Music
                    </h3>

                    {moodEntry.music?.url && (
                      <div className="bg-black/5 border-t border-white/10 max-h-28 overflow-hidden">
                        <MusicEmbed
                          platform={moodEntry.music?.platform}
                          url={moodEntry.music?.url}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              <motion.div
                variants={itemVariants}
                className="bg-white/70 backdrop-blur-sm p-5 rounded-xl border border-blue-50 shadow-sm"
              >
                <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                  <span className="bg-blue-100 p-1.5 rounded-md mr-2">
                    <Share2 className="h-4 w-4 text-blue-600" />
                  </span>
                  Sharing
                </h3>
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                  {moodEntry.sharing?.isPrivate ? (
                    <div className="flex items-center text-blue-700 p-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 mr-2">
                        <Lock className="h-5 w-5 text-blue-600" />
                      </div>
                      <span>This entry is private</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(moodEntry.sharing?.sharedWith?.length ?? 0) > 0 && (
                        <div>
                          <div className="flex items-center text-blue-700 mb-2">
                            <Share2 className="h-4 w-4 mr-2" />
                            <span>
                              Shared with{" "}
                              {moodEntry.sharing?.sharedWith?.length ?? 0}{" "}
                              connection
                              {(moodEntry.sharing?.sharedWith?.length ?? 0) > 1
                                ? "s"
                                : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 pl-6">
                            {(moodEntry.sharing?.sharedWith ?? []).map(
                              (
                                user: {
                                  username?: string;
                                  profileImage?: string;
                                },
                                idx: number
                              ) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"
                                >
                                  {user.profileImage ? (
                                    <img
                                      src={user.profileImage}
                                      alt={user.username || "User"}
                                      className="w-6 h-6 rounded-full object-cover border border-blue-200"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                      {user.username?.[0]?.toUpperCase() || "?"}
                                    </div>
                                  )}
                                  <span className="text-blue-900 font-medium text-xs">
                                    {user.username || "User"}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {(moodEntry.sharing?.sharedWithCircles?.length ?? 0) >
                        0 && (
                        <div>
                          <div className="flex items-center text-blue-700 mb-2">
                            <Users className="h-4 w-4 mr-2" />
                            <span>
                              Shared with{" "}
                              {moodEntry.sharing?.sharedWithCircles?.length ??
                                0}{" "}
                              circle
                              {(moodEntry.sharing?.sharedWithCircles?.length ??
                                0) > 1
                                ? "s"
                                : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 pl-6">
                            {moodEntry.sharing?.sharedWithCircles?.flatMap(
                              (
                                circle: {
                                  members: {
                                    username?: string;
                                    profileImage?: string;
                                  }[];
                                },
                                cidx: number
                              ) =>
                                circle.members.map((member, midx) => (
                                  <div
                                    key={`${cidx}-${midx}`}
                                    className="flex items-center gap-2 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100"
                                  >
                                    {member.profileImage ? (
                                      <img
                                        src={member.profileImage}
                                        alt={member.username || "Member"}
                                        className="w-6 h-6 rounded-full object-cover border border-blue-200"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                        {member.username?.[0]?.toUpperCase() ||
                                          "?"}
                                      </div>
                                    )}
                                    <span className="text-blue-900 font-medium text-xs">
                                      {member.username || "Member"}
                                    </span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      )}

                      {Array.isArray(moodEntry.sharing?.customVersions) &&
                        moodEntry.sharing.customVersions.length > 0 && (
                          <motion.div
                            variants={itemVariants}
                            className="mt-3 pt-3 border-t border-blue-100 sm:mt-4 sm:pt-4"
                          >
                            <h4 className="font-medium text-blue-800 mb-2 sm:mb-3 flex items-center text-sm">
                              <span className="bg-purple-100 p-1 sm:p-1.5 rounded-md mr-1.5 sm:mr-2 inline-flex items-center justify-center">
                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                              </span>
                              Custom Shared Versions
                            </h4>
                            <div className="space-y-3 sm:space-y-4">
                              {moodEntry.sharing.customVersions.map(
                                (customVersion, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 overflow-hidden"
                                  >
                                    <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm p-2 sm:p-3 border-b border-purple-100">
                                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                        {customVersion.user?.profileImage ? (
                                          <img
                                            src={
                                              customVersion.user.profileImage
                                            }
                                            alt=""
                                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-purple-200 flex-shrink-0"
                                          />
                                        ) : (
                                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold border border-purple-200 flex-shrink-0">
                                            {customVersion.user?.username?.[0]?.toUpperCase() ||
                                              "?"}
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <span className="font-medium text-purple-900 text-xs sm:text-sm truncate block max-w-[120px] sm:max-w-none">
                                            {customVersion.user?.username ||
                                              "User"}
                                          </span>
                                          <div className="text-xs text-purple-600 hidden sm:block">
                                            Custom version
                                          </div>
                                        </div>
                                      </div>

                                      <div className="bg-purple-100 text-purple-700 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-xs flex items-center">
                                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                        <span className="hidden xs:inline">
                                          Custom
                                        </span>
                                      </div>
                                    </div>

                                    {customVersion.notes && (
                                      <div className="p-2 sm:p-4">
                                        <div className="text-xs font-medium text-purple-700 mb-1 sm:mb-2 uppercase tracking-wider">
                                          Custom Note
                                        </div>
                                        <div className="bg-white p-2 sm:p-4 rounded-lg border border-purple-100">
                                          <p className="text-gray-700 text-xs sm:text-sm break-words whitespace-pre-wrap overflow-hidden">
                                            {customVersion.notes}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {(Array.isArray(customVersion.mediaUrls) &&
                                      customVersion.mediaUrls.length > 0) ||
                                    (Array.isArray(customVersion.media) &&
                                      customVersion.media.length > 0) ? (
                                      <div className="px-2 pb-2 pt-0 sm:p-4 sm:pt-0">
                                        <div className="text-xs font-medium text-purple-700 mt-2 mb-1 sm:mt-4 sm:mb-2 uppercase tracking-wider">
                                          Custom Media
                                        </div>

                                        <div className="overflow-x-auto pb-1 sm:pb-2 -mx-2 px-2">
                                          <div className="flex gap-1.5 sm:gap-2">
                                            {customVersion.mediaUrls?.map(
                                              (url, mediaIdx) => (
                                                <div
                                                  key={`url-${mediaIdx}`}
                                                  className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-purple-100"
                                                >
                                                  {url.includes("video") ? (
                                                    <div className="w-full h-full bg-purple-50 flex items-center justify-center">
                                                      <PlayCircle className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                                                    </div>
                                                  ) : (
                                                    <img
                                                      src={url}
                                                      alt=""
                                                      className="w-full h-full object-cover"
                                                      loading="lazy"
                                                    />
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}

                                    {customVersion.music?.title && (
                                      <div className="p-2 pt-0 sm:p-4 sm:pt-0">
                                        <div className="text-xs font-medium text-purple-700 mt-2 mb-1 sm:mt-4 sm:mb-2 uppercase tracking-wider">
                                          Custom Music
                                        </div>
                                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg overflow-hidden">
                                          <div className="p-2 sm:p-3 relative overflow-hidden">
                                            <div className="relative z-10 flex items-center">
                                              <div className="bg-white/20 backdrop-blur-md p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                                                <div className="text-lg sm:text-xl">
                                                  {
                                                    getPlatformDetails(
                                                      customVersion.music
                                                        .platform
                                                    ).icon
                                                  }
                                                </div>
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="text-2xs sm:text-xs font-medium text-purple-100 mb-0.5">
                                                  CUSTOM TRACK
                                                </div>
                                                <h3 className="text-xs sm:text-sm font-bold mb-0.5 truncate max-w-full">
                                                  {customVersion.music.title}
                                                </h3>
                                                {customVersion.music.url && (
                                                  <a
                                                    href={
                                                      customVersion.music.url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-2xs sm:text-xs flex items-center text-purple-100 hover:text-white"
                                                  >
                                                    <span className="truncate">
                                                      Listen
                                                    </span>
                                                    <ExternalLink className="h-2 w-2 sm:h-2.5 sm:w-2.5 ml-1 flex-shrink-0" />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </motion.div>
                        )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <div className="bg-blue-50 rounded-xl p-8 text-center">
              <p className="text-blue-800 font-medium">
                Could not load today's mood entry.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const getYouTubeEmbed = (raw: string): string | null => {
  const valid = getValidUrl(raw);
  if (!valid) return null;
  try {
    const u = new URL(valid);
    const host = u.host.replace(/^www\./, "");
    let v = u.searchParams.get("v");
    const list = u.searchParams.get("list");

    if (host === "youtu.be") v = u.pathname.slice(1);
    if (
      (/youtube\.com$/.test(host) || /music\.youtube\.com$/.test(host)) &&
      !v
    ) {
      if (u.pathname.startsWith("/shorts/")) v = u.pathname.split("/")[2];
      if (u.pathname.startsWith("/embed/")) v = u.pathname.split("/")[2];
    }

    if (list && !v)
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(
        list
      )}`;

    if (v) {
      const qs = new URLSearchParams({ rel: "0" });
      if (list) qs.set("list", list);
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        v
      )}?${qs.toString()}`;
    }
    return null;
  } catch {
    return null;
  }
};

const getAppleMusicEmbed = (raw: string): string | null => {
  const valid = getValidUrl(raw);
  if (!valid) return null;
  try {
    const u = new URL(valid);
    if (!/apple\.com$/.test(u.host)) return null;
    u.host = "embed.music.apple.com";
    return u.toString();
  } catch {
    return null;
  }
};

const MusicEmbed = ({
  platform,
  url,
}: {
  platform?: string | null;
  url?: string | null;
}) => {
  if (!url) return null;
  const p = (platform ?? "").toLowerCase();

  if (p === "spotify") {
    const v = getValidUrl(url);
    return v ? <Spotify wide link={v} /> : null;
  }

  if (p.includes("youtube")) {
    const src = getYouTubeEmbed(url);
    return src ? (
      <iframe
        className="w-full h-24 sm:h-28"
        src={src}
        title="YouTube player"
        frameBorder={0}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    ) : null;
  }

  if (p.includes("apple")) {
    const src = getAppleMusicEmbed(url);
    return src ? (
      <iframe
        className="w-full h-24 sm:h-28"
        src={src}
        title="Apple Music player"
        allow="autoplay *; encrypted-media *; clipboard-write"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
      />
    ) : null;
  }

  return null;
};

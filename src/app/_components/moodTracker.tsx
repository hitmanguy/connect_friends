"use client";

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { trpc } from "../../../utils/providers/TrpcProviders";
import {
  Calendar,
  Smile,
  Frown,
  Meh,
  Music,
  User,
  Lock,
  Share2,
  Plus,
  X,
  Save,
  PlayCircle,
  Upload,
  Users,
  Info,
  Check,
} from "lucide-react";
import { Spotify } from "react-spotify-embed";
import ViewMoodEntry from "./viewmood";
import clsx from "clsx";
import { CharLimitInfo } from "./char_limit";

const DEFAULT_ACTIVITIES = [
  "Exercise",
  "Work",
  "Reading",
  "Socializing",
  "Relaxing",
  "Cooking",
  "Gaming",
  "Studying",
  "Shopping",
  "Traveling",
  "Meditating",
  "Cleaning",
];

const MUSIC_PLATFORMS = [
  { value: "spotify", label: "Spotify" },
  { value: "youtube", label: "YouTube" },
  { value: "youtubeMusic", label: "YouTube Music" },
  { value: "appleMusic", label: "Apple Music" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CHAR_LIMIT = 20000;

import React from "react";

type OptimizedCheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: React.ReactNode;
  id: string;
};

const OptimizedCheckbox = memo(
  ({ label = "Share", id, checked, onChange }: OptimizedCheckboxProps) => (
    <button
      type="button"
      id={id}
      aria-checked={checked}
      role="checkbox"
      tabIndex={0}
      onClick={() => onChange?.({} as any)}
      className={`w-20 h-8 flex items-center justify-center border-2 rounded-md transition-colors
        ${
          checked
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700"
        }
        focus:outline-none focus:ring-2 focus:ring-blue-400 select-none`}
      style={{ minWidth: 64 }}
    >
      <span className="flex items-center justify-center w-full h-full font-medium text-sm">
        {label}
        {checked && <Check className="ml-2 h-4 w-4 text-blue-600" />}
      </span>
    </button>
  )
);

OptimizedCheckbox.displayName = "OptimizedCheckbox";

const getValidUrl = (urlString: string): string | null => {
  if (!urlString || !urlString.trim()) return null;

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

const getYouTubeEmbed = (raw: string): string | null => {
  const valid = getValidUrl(raw);
  if (!valid) return null;
  try {
    const u = new URL(valid);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    let v = u.searchParams.get("v") || "";
    const list = u.searchParams.get("list") || "";

    if (host === "youtu.be") {
      v = u.pathname.slice(1);
    } else if (host.endsWith("youtube.com") || host === "music.youtube.com") {
      if (!v && u.pathname.startsWith("/shorts/"))
        v = u.pathname.split("/")[2] || "";
      if (!v && u.pathname.startsWith("/embed/"))
        v = u.pathname.split("/")[2] || "";
    }

    const t = u.searchParams.get("start") || u.searchParams.get("t") || "";
    const parseTime = (val: string) => {
      if (!val) return undefined;
      if (/^\d+$/.test(val)) return parseInt(val, 10);
      const m = val.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
      if (!m) return undefined;
      const h = parseInt(m[1] || "0", 10);
      const mm = parseInt(m[2] || "0", 10);
      const s = parseInt(m[3] || "0", 10);
      return h * 3600 + mm * 60 + s;
    };
    const start = parseTime(t);

    if (list && !v) {
      const qs = new URLSearchParams();
      qs.set("list", list);
      qs.set("rel", "0");
      return `https://www.youtube-nocookie.com/embed/videoseries?${qs.toString()}`;
    }

    if (v) {
      const qs = new URLSearchParams();
      qs.set("rel", "0");
      if (list) qs.set("list", list);
      if (typeof start === "number" && start > 0)
        qs.set("start", String(start));
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
    if (!/apple\.com$/i.test(u.hostname)) return null;
    u.hostname = "embed.music.apple.com";
    return u.toString();
  } catch {
    return null;
  }
};

const validateMusicUrl = (url: string, platform: string): boolean => {
  try {
    const parsedUrl = new URL(url);

    switch (platform) {
      case "spotify":
        return parsedUrl.hostname.includes("spotify.com");

      case "youtube":
        return (
          parsedUrl.hostname.includes("youtube.com") ||
          parsedUrl.hostname.includes("youtu.be")
        );

      case "youtubeMusic":
        return parsedUrl.hostname.includes("music.youtube.com");

      case "appleMusic":
        return parsedUrl.hostname.includes("music.apple.com");

      case "other":
        return true;

      default:
        return false;
    }
  } catch (e) {
    return false;
  }
};

const extractTitleFromUrl = async (
  url: string,
  platform: string
): Promise<string> => {
  try {
    const parsedUrl = new URL(url);

    switch (platform) {
      case "spotify":
        if (parsedUrl.pathname.includes("/track/")) {
          const trackId = parsedUrl.pathname.split("/track/")[1]?.split("?")[0];
          if (trackId) {
            try {
              const response = await fetch(
                `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
              );
              if (response.ok) {
                const data = await response.json();
                return data.title || "Spotify Track";
              }
            } catch (err) {
              console.log("Error fetching Spotify metadata:", err);
              return trackId.replace(/-/g, " ").replace(/_/g, " ");
            }
          }
          return "Spotify Track";
        }
        return "Spotify Music";

      case "youtube":
        const ytTitle =
          parsedUrl.searchParams.get("v") ||
          parsedUrl.pathname.replace("/", "") ||
          "YouTube Video";

        try {
          const response = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(url)}`
          );
          if (response.ok) {
            const data = await response.json();
            return data.title || ytTitle;
          }
        } catch (err) {
          console.log("Error fetching YouTube metadata:", err);
        }

        return ytTitle;

      case "youtubeMusic":
        return "YouTube Music Track";

      case "appleMusic":
        if (parsedUrl.pathname.includes("/album/")) {
          const parts = parsedUrl.pathname.split("/");
          const albumIndex = parts.findIndex((part) => part === "album");
          if (albumIndex !== -1 && parts.length > albumIndex + 1) {
            return decodeURIComponent(parts[albumIndex + 1].replace(/-/g, " "));
          }
        }
        return "Apple Music Track";

      default:
        const domain = parsedUrl.hostname.replace("www.", "").split(".")[0];
        return `${domain.charAt(0).toUpperCase() + domain.slice(1)} Music`;
    }
  } catch (e) {
    console.error("Error extracting title:", e);
    return "Music";
  }
};

export default function MoodTrackerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [moodData, setMoodData] = useState({
    mood: 3,
    activities: [] as string[],
    customActivity: "",
    notes: "",
    privateNotes: "",
    media: [] as {
      id: string;
      url: string;
      type: "image" | "video";
      file?: File;
    }[],
    music: {
      title: "",
      url: "",
      platform: "spotify" as const,
    },
    sharing: {
      isPrivate: false,
      selectedConnections: [] as string[],
      sharedWith: [] as string[],
      customVersions: [] as {
        userId: string;
        notes: string;
        mediaIds: string[];
      }[],
      selectedCircles: [] as string[],
      circleCustomNotes: [] as {
        memberIds: string[];
        notes: string;
        mediaIds: string[];
      }[],
    },
  });

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [activeShareTab, setActiveShareTab] = useState<
    "connections" | "circles"
  >("connections");

  const [customizeConnections, setCustomizeConnections] = useState<Set<string>>(
    new Set()
  );
  const [customizeCircles, setCustomizeCircles] = useState<Set<string>>(
    new Set()
  );

  const [pendingClicks, setPendingClicks] = useState<Set<string>>(new Set());
  const [musicUrlError, setMusicUrlError] = useState<string>("");
  const [isValidatingUrl, setIsValidatingUrl] = useState<boolean>(false);
  const [shareMediaWithAll, setShareMediaWithAll] = useState<boolean>(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const currentUserQuery = trpc.auth.getCurrentUser.useQuery({
    fulluser: true,
  });
  const currentUser = currentUserQuery.data?.user;
  const isHost = currentUser?.UserRole === "host";
  const connections = isHost
    ? trpc.user.getAllUsers.useQuery(undefined, {
        staleTime: 1000 * 60 * 5,
      }).data?.users || []
    : trpc.connection.getUserConnections.useQuery(undefined, {
        staleTime: 1000 * 60 * 5,
      }).data?.users || [];

  const microCirclesQuery = trpc.microCircle.getMicroCircles.useQuery(
    undefined,
    {
      staleTime: 1000 * 60 * 5,
    }
  );
  const microCircles = microCirclesQuery.data?.circles || [];

  const todayEntryQuery = trpc.mood.checkTodayEntry.useQuery({ timezone });
  const alreadySubmittedToday = todayEntryQuery.data?.hasSubmitted || false;

  const todayIso = useMemo(() => {
    const now = new Date();
    return now.toISOString();
  }, []);
  const todayMoodQuery = trpc.mood.getMoodByDate.useQuery(
    { date: todayIso, timezone },
    { enabled: alreadySubmittedToday }
  );

  const isLoading = microCirclesQuery.isLoading;

  useEffect(() => {
    console.time("MoodTracker-Render");

    return () => {
      console.timeEnd("MoodTracker-Render");
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // console.log("Click detected at:", e.clientX, e.clientY);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [connections]);

  const createMoodMutation = trpc.mood.createMood.useMutation({
    onSuccess: () => {
      alert("Mood tracker entry saved successfully!");
      router.refresh();
    },
    onError: (error: any) => {
      alert(`Failed to save mood: ${error.message}`);
      setSubmitting(false);
    },
  });

  const toggleActivity = useCallback((activity: string) => {
    setMoodData((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((a) => a !== activity)
        : [...prev.activities, activity],
    }));
  }, []);

  const addCustomActivity = useCallback(() => {
    if (moodData.customActivity.trim()) {
      setMoodData((prev) => ({
        ...prev,
        activities: [...prev.activities, prev.customActivity.trim()],
        customActivity: "",
      }));
    }
  }, [moodData.customActivity]);

  const toggleShareWithAll = useCallback(() => {
    setShareMediaWithAll((prev) => !prev);

    setMoodData((prev) => {
      const allMediaIds = prev.media.map((media) => media.id);

      const updatedCustomVersions = [...prev.sharing.customVersions];
      prev.sharing.selectedConnections.forEach((connId) => {
        const versionIndex = updatedCustomVersions.findIndex(
          (v) => v.userId === connId
        );

        if (versionIndex >= 0) {
          updatedCustomVersions[versionIndex] = {
            ...updatedCustomVersions[versionIndex],
            mediaIds: !shareMediaWithAll ? allMediaIds : [],
          };
        } else if (!shareMediaWithAll) {
          updatedCustomVersions.push({
            userId: connId,
            notes: prev.notes,
            mediaIds: allMediaIds,
          });
        }
      });

      const updatedCircleCustomNotes = [...prev.sharing.circleCustomNotes];
      prev.sharing.selectedCircles.forEach((circleId) => {
        const circle = microCircles.find((c) => c._id === circleId);
        if (!circle) return;

        const memberIds = circle.members.map((m: { _id: string }) => m._id);
        const noteIndex = updatedCircleCustomNotes.findIndex(
          (v) =>
            Array.isArray(v.memberIds) &&
            v.memberIds.length === memberIds.length &&
            v.memberIds.every((id) => memberIds.includes(id))
        );

        if (noteIndex >= 0) {
          updatedCircleCustomNotes[noteIndex] = {
            ...updatedCircleCustomNotes[noteIndex],
            mediaIds: !shareMediaWithAll ? allMediaIds : [],
          };
        } else if (!shareMediaWithAll) {
          updatedCircleCustomNotes.push({
            memberIds,
            notes: prev.notes,
            mediaIds: allMediaIds,
          });
        }
      });

      return {
        ...prev,
        sharing: {
          ...prev.sharing,
          customVersions: updatedCustomVersions,
          circleCustomNotes: updatedCircleCustomNotes,
          shareWithAll: !shareMediaWithAll,
        },
      };
    });
  }, [shareMediaWithAll, microCircles]);

  const validateAndProcessMusicUrl = useCallback(
    (url: string, platform: string) => {
      setMusicUrlError("");

      if (!url.trim()) return;

      let validUrl = getValidUrl(url);
      if (!validUrl) {
        setMusicUrlError(
          "Please enter a valid URL that starts with http:// or https://"
        );
        return;
      }

      const isValidForPlatform = validateMusicUrl(validUrl, platform);
      if (!isValidForPlatform) {
        setMusicUrlError(
          `This doesn't look like a valid ${
            MUSIC_PLATFORMS.find((p) => p.value === platform)?.label || platform
          } URL`
        );
      }
    },
    []
  );

  const handleMusicUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUrl = e.target.value;
      setMoodData((prev) => ({
        ...prev,
        music: {
          ...prev.music,
          url: newUrl,
        },
      }));

      if (newUrl.trim() && !isValidatingUrl) {
        setIsValidatingUrl(true);
        setTimeout(() => {
          validateAndProcessMusicUrl(newUrl, moodData.music.platform);
          setIsValidatingUrl(false);
        }, 800);
      }
    },
    [validateAndProcessMusicUrl, moodData.music.platform, isValidatingUrl]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setMediaError("");

      const oversizedFiles = Array.from(files).filter(
        (file) => file.size > MAX_FILE_SIZE
      );
      if (oversizedFiles.length > 0) {
        setMediaError(
          `${oversizedFiles.length} file(s) exceed the 10MB size limit`
        );
        return;
      }

      const filesToProcess = Array.from(files).filter(
        (file) => file.size <= MAX_FILE_SIZE
      );

      const processFiles = async () => {
        const newMedia = await Promise.all(
          Array.from(filesToProcess).map(async (file) => ({
            id: `media-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            url: URL.createObjectURL(file),
            type: file.type.startsWith("image/")
              ? ("image" as const)
              : ("video" as const),
            file,
          }))
        );

        setMoodData((prev) => {
          const updatedMedia = [...prev.media, ...newMedia];

          const updatedCustomVersions = prev.sharing.customVersions.map(
            (version) => {
              const newMediaIds = newMedia.map((media) => media.id);
              return {
                ...version,
                mediaIds: [...(version.mediaIds || []), ...newMediaIds],
              };
            }
          );

          const updatedCircleCustomNotes = prev.sharing.circleCustomNotes.map(
            (circle) => {
              const newMediaIds = newMedia.map((media) => media.id);
              return {
                ...circle,
                mediaIds: [...(circle.mediaIds || []), ...newMediaIds],
              };
            }
          );

          return {
            ...prev,
            media: updatedMedia,
            sharing: {
              ...prev.sharing,
              customVersions: updatedCustomVersions,
              circleCustomNotes: updatedCircleCustomNotes,
            },
          };
        });
      };

      processFiles();
    },
    []
  );

  const toggleConnectionCustomize = useCallback((connectionId: string) => {
    setCustomizeConnections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId);
      } else {
        newSet.add(connectionId);
      }
      return newSet;
    });
  }, []);

  const toggleCircleCustomize = useCallback((circleId: string) => {
    setCustomizeCircles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(circleId)) {
        newSet.delete(circleId);
      } else {
        newSet.add(circleId);
      }
      return newSet;
    });
  }, []);

  const toggleConnectionShare = useCallback(
    (connectionId: string) => {
      setPendingClicks((prev) => {
        const newSet = new Set(prev);
        newSet.add(`conn-${connectionId}`);
        return newSet;
      });

      setMoodData((prev) => {
        const { selectedConnections } = prev.sharing;
        const isSelected = selectedConnections.includes(connectionId);

        let newSharing;

        if (isSelected) {
          newSharing = {
            ...prev.sharing,
            selectedConnections: selectedConnections.filter(
              (id) => id !== connectionId
            ),
            customVersions: prev.sharing.customVersions.filter(
              (v) => v.userId !== connectionId
            ),
          };

          setCustomizeConnections((prevSet) => {
            const newSet = new Set(prevSet);
            newSet.delete(connectionId);
            return newSet;
          });
        } else {
          const allMediaIds = prev.media.map((media) => media.id);

          newSharing = {
            ...prev.sharing,
            selectedConnections: [...selectedConnections, connectionId],
            customVersions: [
              ...prev.sharing.customVersions,
              {
                userId: connectionId,
                notes: prev.notes,
                mediaIds: allMediaIds,
              },
            ],
          };
        }

        setTimeout(() => {
          setPendingClicks((prevClicks) => {
            const newSet = new Set(prevClicks);
            newSet.delete(`conn-${connectionId}`);
            return newSet;
          });
        }, 300);

        return {
          ...prev,
          sharing: newSharing,
        };
      });
    },
    [setCustomizeConnections]
  );

  const toggleCircleShare = useCallback(
    (circleId: string) => {
      setPendingClicks((prev) => {
        const newSet = new Set(prev);
        newSet.add(`circle-${circleId}`);
        return newSet;
      });

      requestAnimationFrame(() => {
        setMoodData((prev) => {
          const { selectedCircles } = prev.sharing;
          const isSelected = selectedCircles.includes(circleId);

          let newSharing;

          if (isSelected) {
            newSharing = {
              ...prev.sharing,
              selectedCircles: selectedCircles.filter((id) => id !== circleId),
              circleCustomNotes: prev.sharing.circleCustomNotes.filter(
                (item) => {
                  const circle = microCircles.find((c) => c._id === circleId);
                  if (!circle) return true;
                  const memberIds = circle.members.map(
                    (m: { _id: string }) => m._id
                  );
                  return !(
                    Array.isArray(item.memberIds) &&
                    item.memberIds.length === memberIds.length &&
                    item.memberIds.every((id) => memberIds.includes(id))
                  );
                }
              ),
            };

            setCustomizeCircles((prevSet) => {
              const newSet = new Set(prevSet);
              newSet.delete(circleId);
              return newSet;
            });
          } else {
            const allMediaIds = prev.media.map((media) => media.id);
            const circle = microCircles.find((c) => c._id === circleId);

            if (circle) {
              const memberIds = circle.members.map(
                (m: { _id: string }) => m._id
              );

              newSharing = {
                ...prev.sharing,
                selectedCircles: [...selectedCircles, circleId],
                circleCustomNotes: [
                  ...prev.sharing.circleCustomNotes,
                  {
                    memberIds,
                    notes: prev.notes,
                    mediaIds: allMediaIds,
                  },
                ],
              };
            } else {
              newSharing = {
                ...prev.sharing,
                selectedCircles: [...selectedCircles, circleId],
              };
            }
          }

          setTimeout(() => {
            setPendingClicks((prev) => {
              const newSet = new Set(prev);
              newSet.delete(`circle-${circleId}`);
              return newSet;
            });
          }, 300);

          return {
            ...prev,
            sharing: newSharing,
          };
        });
      });
    },
    [setCustomizeCircles, microCircles]
  );

  const toggleCustomMediaSelection = useCallback(
    (connectionId: string, mediaIndex: number) => {
      setMoodData((prev) => {
        const customVersions = [...prev.sharing.customVersions];
        const existingVersionIndex = customVersions.findIndex(
          (v) => v.userId === connectionId
        );

        if (existingVersionIndex >= 0) {
          const currentVersion = customVersions[existingVersionIndex];
          const mediaId = prev.media[mediaIndex]?.id;

          if (!mediaId) return prev;

          const currentMediaIds = currentVersion.mediaIds || [];
          const newMediaIds = currentMediaIds.includes(mediaId)
            ? currentMediaIds.filter((id) => id !== mediaId)
            : [...currentMediaIds, mediaId];

          customVersions[existingVersionIndex] = {
            ...currentVersion,
            mediaIds: newMediaIds,
          };
        } else {
          const notes = prev.notes;
          const mediaId = prev.media[mediaIndex]?.id;

          if (!mediaId) return prev;

          customVersions.push({
            userId: connectionId,
            notes,
            mediaIds: [mediaId],
          });
        }

        return {
          ...prev,
          sharing: {
            ...prev.sharing,
            customVersions,
          },
        };
      });
    },
    []
  );
  const toggleCircleMediaSelection = useCallback(
    (circleId: string, mediaIndex: number) => {
      setMoodData((prev) => {
        const circle = microCircles.find((c) => c._id === circleId);
        if (!circle) return prev;
        const memberIds = circle.members.map((m: { _id: string }) => m._id);
        const mediaId = prev.media[mediaIndex]?.id;

        if (!mediaId) return prev;

        const circleCustomNotes = [...prev.sharing.circleCustomNotes];
        const existingNoteIndex = circleCustomNotes.findIndex(
          (v) =>
            Array.isArray(v.memberIds) &&
            v.memberIds.length === memberIds.length &&
            v.memberIds.every((id) => memberIds.includes(id))
        );

        if (existingNoteIndex >= 0) {
          const currentVersion = circleCustomNotes[existingNoteIndex];
          const currentMediaIds = currentVersion.mediaIds || [];

          const newMediaIds = currentMediaIds.includes(mediaId)
            ? currentMediaIds.filter((id) => id !== mediaId)
            : [...currentMediaIds, mediaId];

          circleCustomNotes[existingNoteIndex] = {
            ...currentVersion,
            mediaIds: newMediaIds,
          };
        } else {
          const notes = prev.notes;
          circleCustomNotes.push({
            memberIds,
            notes,
            mediaIds: [mediaId],
          });
        }

        return {
          ...prev,
          sharing: {
            ...prev.sharing,
            circleCustomNotes,
          },
        };
      });
    },
    [microCircles]
  );
  const updateCustomVersion = useCallback(
    (connectionId: string, notes: string) => {
      setMoodData((prev) => {
        const customVersions = [...prev.sharing.customVersions];
        const existingVersionIndex = customVersions.findIndex(
          (v) => v.userId === connectionId
        );

        if (existingVersionIndex >= 0) {
          customVersions[existingVersionIndex] = {
            ...customVersions[existingVersionIndex],
            notes,
          };
        } else {
          customVersions.push({
            userId: connectionId,
            notes,
            mediaIds: [],
          });
        }

        return {
          ...prev,
          sharing: {
            ...prev.sharing,
            customVersions,
          },
        };
      });
    },
    []
  );

  const updateCircleCustomNotes = useCallback(
    (circleId: string, notes: string) => {
      setMoodData((prev) => {
        const circle = microCircles.find((c) => c._id === circleId);
        if (!circle) return prev;
        const memberIds = circle.members.map((m: { _id: string }) => m._id);

        const circleCustomNotes = [...prev.sharing.circleCustomNotes];
        const existingNoteIndex = circleCustomNotes.findIndex(
          (v) =>
            Array.isArray(v.memberIds) &&
            v.memberIds.length === memberIds.length &&
            v.memberIds.every((id) => memberIds.includes(id))
        );

        if (existingNoteIndex >= 0) {
          circleCustomNotes[existingNoteIndex] = {
            ...circleCustomNotes[existingNoteIndex],
            notes,
          };
        } else {
          circleCustomNotes.push({
            memberIds,
            notes,
            mediaIds: [],
          });
        }

        return {
          ...prev,
          sharing: {
            ...prev.sharing,
            circleCustomNotes,
          },
        };
      });
    },
    [microCircles]
  );

  const getBase64FromFile = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);

    try {
      const mediaFiles = moodData.media.filter((media) => media.file);
      const mediaBase64 = await Promise.all(
        mediaFiles.map((media) => getBase64FromFile(media.file!))
      );

      const mediaIdToIndexMap: Record<string, number> = {};
      mediaFiles.forEach((media, index) => {
        mediaIdToIndexMap[media.id] = index;
      });

      const existingCloudinaryMedia = moodData.media
        .filter((media) => !media.file)
        .map((media) => ({
          id: media.id,
          url: media.url,
          type: media.type,
        }));

      const musicData = { ...moodData.music };
      if (musicData.url) {
        const validUrl = getValidUrl(musicData.url);
        if (validUrl) {
          musicData.url = validUrl;

          // Try to extract title if needed
          if (!musicData.title || musicData.title === "") {
            try {
              const extractedTitle = await extractTitleFromUrl(
                validUrl,
                musicData.platform
              );
              musicData.title = extractedTitle;
            } catch (error) {
              console.error("Error extracting title:", error);
              musicData.title = "Music";
            }
          }
        } else {
          musicData.url = "";
        }
      }

      const sharingData = {
        isPrivate: moodData.sharing.isPrivate,
        sharedWith: moodData.sharing.selectedConnections,
        mediaIdToIndexMap,
        existingCloudinaryMedia,
        customVersions: moodData.sharing.customVersions.map(
          ({ userId, notes, mediaIds = [] }) => ({
            userId,
            notes,
            mediaIds,
          })
        ),
        sharedWithCircles: moodData.sharing.selectedCircles.map((circleId) => {
          const customNotes = moodData.sharing.circleCustomNotes.find(
            (item) => {
              const circle = microCircles.find((c) => c._id === circleId);
              if (!circle) return false;
              const memberIds = circle.members.map(
                (m: { _id: string }) => m._id
              );
              return (
                Array.isArray(item.memberIds) &&
                item.memberIds.length === memberIds.length &&
                item.memberIds.every((id) => memberIds.includes(id))
              );
            }
          );

          return {
            circleId,
            customNotes: customNotes?.notes,
            mediaIds: customNotes?.mediaIds || [],
          };
        }),
      };

      await createMoodMutation.mutateAsync({
        mood: moodData.mood,
        activities: moodData.activities,
        notes: moodData.notes,
        privateNotes: moodData.privateNotes,
        media: mediaBase64,
        music: musicData,
        sharing: sharingData,
        timezone: timezone,
      });
      window.location.reload();
    } catch (error) {
      console.error("Error submitting mood data:", error);
      setSubmitting(false);
    }
  }, [moodData, getBase64FromFile, createMoodMutation, microCircles]);

  const SafeUrlEmbed = ({
    url,
    platform,
  }: {
    url: string;
    platform: string;
  }) => {
    const safeUrl = useMemo(() => getValidUrl(url), [url]);

    if (!safeUrl) {
      return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">
            Cannot preview: Invalid URL
          </p>
          <p className="text-red-500 text-sm mt-1">
            The URL you entered isn't in a format we can recognize.
          </p>
        </div>
      );
    }

    const p = (platform || "").toLowerCase();

    if (p === "spotify") {
      return <Spotify link={safeUrl} />;
    }

    if (p === "youtube" || p === "youtubemusic" || p.includes("youtube")) {
      const src = getYouTubeEmbed(safeUrl);
      return src ? (
        <div className="overflow-hidden rounded-lg border border-blue-100">
          <iframe
            className="w-full aspect-video"
            src={src}
            title="YouTube player"
            frameBorder={0}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="mt-2 text-sm text-blue-600">
          Link added, but we couldn’t build a preview. You can still share the
          link.
        </div>
      );
    }

    if (p === "applemusic" || p.includes("apple")) {
      const src = getAppleMusicEmbed(safeUrl);
      return src ? (
        <div className="overflow-hidden rounded-lg border border-blue-100">
          <iframe
            className="w-full h-28 sm:h-32"
            src={src}
            title="Apple Music player"
            allow="autoplay *; encrypted-media *; clipboard-write"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
          />
        </div>
      ) : (
        <div className="mt-2 text-sm text-blue-600">
          Link added, but we couldn’t build a preview. You can still share the
          link.
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-600 font-medium">Link added</p>
        <p className="text-blue-500 text-sm mt-1 truncate">
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {safeUrl}
          </a>
        </p>
      </div>
    );
  };

  const moodIcons = [
    { value: 1, icon: <Frown className="w-8 h-8" />, label: "Terrible" },
    { value: 2, icon: <Frown className="w-8 h-8" />, label: "Bad" },
    { value: 3, icon: <Meh className="w-8 h-8" />, label: "Okay" },
    { value: 4, icon: <Smile className="w-8 h-8" />, label: "Good" },
    { value: 5, icon: <Smile className="w-8 h-8" />, label: "Great" },
  ];

  if (alreadySubmittedToday) {
    let todayMood = todayMoodQuery.data?.entry;

    return (
      <ViewMoodEntry
        moodEntry={
          todayMood
            ? {
                ...todayMood,
                sharing: {
                  ...todayMood.sharing,
                  sharedWithCircles: Array.isArray(
                    todayMood.sharing.sharedWithCircles
                  )
                    ? todayMood.sharing.sharedWithCircles.map(
                        (circle: any) => ({
                          ...circle,
                          customNotes:
                            circle.customNotes === null
                              ? undefined
                              : circle.customNotes,
                          members: Array.isArray(circle.members)
                            ? circle.members.map((member: any) => ({
                                _id: member._id,
                                username: member.username,
                                email: member.email,
                                profileImage: member.profileImage,
                              }))
                            : [],
                        })
                      )
                    : [],
                  customVersions: Array.isArray(
                    todayMood.sharing.customVersions
                  )
                    ? todayMood.sharing.customVersions.map((v: any) => ({
                        ...v,
                        notes: v.notes === null ? undefined : v.notes,
                      }))
                    : todayMood.sharing.customVersions,
                },
              }
            : todayMood
        }
        isLoading={todayMoodQuery.isLoading}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden border-2 border-blue-100 p-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-64 bg-blue-100 rounded mb-4"></div>
            <div className="h-64 w-full bg-blue-50 rounded-lg"></div>
            <div className="mt-4 text-blue-600">
              Loading your information...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div
        className={clsx(
          "bg-white border-blue-200 shadow-xl transition-all duration-200",
          "fixed inset-0 z-50 border-0 rounded-none flex flex-col",
          "sm:relative sm:p-4 sm:md:p-6 sm:max-w-4xl sm:mx-auto sm:my-6 sm:rounded-xl sm:border-2 sm:z-auto"
        )}
      >
        <div
          className={clsx(
            "flex items-center justify-between shrink-0",
            "sticky top-0 z-10 bg-white border-b border-blue-100",
            "p-4 sm:p-6 sm:border-b-0"
          )}
        >
          <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
            Today's Mood
          </h1>
          <div className="bg-blue-50 rounded-lg px-3 py-1 text-blue-600 text-sm font-medium">
            <Calendar className="inline-block mr-1 h-4 w-4" />
            {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 md:p-8 pb-24 sm:pb-6">
            {" "}
            <div className="mb-6 sm:mb-8">
              <div className="flex justify-between items-center">
                {[1, 2, 3].map((stepNum) => (
                  <div
                    key={stepNum}
                    className="flex flex-col items-center"
                    onClick={() => {
                      if (stepNum < step) setStep(stepNum);
                    }}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        stepNum <= step
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-400"
                      } ${stepNum < step ? "cursor-pointer" : ""}`}
                    >
                      {stepNum}
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        stepNum <= step ? "text-blue-900" : "text-blue-300"
                      }`}
                    >
                      {stepNum === 1
                        ? "Mood & Activities"
                        : stepNum === 2
                        ? "Notes & Sharing"
                        : "Music & Review"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-1 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                />
              </div>
            </div>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-blue-900 mb-4">
                      How are you feeling today?
                    </h2>
                    <div className="flex justify-center space-x-4">
                      {moodIcons.map((item) => (
                        <div
                          key={item.value}
                          className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
                            moodData.mood === item.value
                              ? "bg-blue-100 scale-110 shadow-sm"
                              : "hover:bg-blue-50"
                          }`}
                          onClick={() =>
                            setMoodData({ ...moodData, mood: item.value })
                          }
                        >
                          <div
                            className={`${
                              moodData.mood === item.value
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <span
                            className={`text-xs mt-2 ${
                              moodData.mood === item.value
                                ? "text-blue-700 font-medium"
                                : "text-gray-500"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-blue-900 mb-4">
                      What did you do today?
                    </h2>
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        {DEFAULT_ACTIVITIES.map((activity) => (
                          <button
                            key={activity}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                              moodData.activities.includes(activity)
                                ? "bg-blue-600 text-white"
                                : "bg-white text-blue-800 hover:bg-blue-100"
                            }`}
                            onClick={() => toggleActivity(activity)}
                          >
                            {activity}
                          </button>
                        ))}
                      </div>
                      <div className="flex">
                        <input
                          type="text"
                          placeholder="Add a custom activity..."
                          value={moodData.customActivity}
                          onChange={(e) => {
                            if (e.target.value.length <= 100) {
                              setMoodData({
                                ...moodData,
                                customActivity: e.target.value,
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              addCustomActivity();
                            }
                          }}
                          maxLength={100}
                          className="flex-1 px-3 py-2 border border-blue-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={addCustomActivity}
                          disabled={!moodData.customActivity.trim()}
                          className="px-4 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      {moodData.activities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {moodData.activities.map((activity) => (
                            <div
                              key={activity}
                              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                            >
                              {activity}
                              <button
                                onClick={() => toggleActivity(activity)}
                                className="ml-1.5 text-blue-600 hover:text-blue-800"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep(2)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-blue-900 mb-2">
                      Tell us about your day
                    </h2>
                    <p className="text-sm text-blue-700 mb-4">
                      This will be visible to connections you share with
                    </p>
                    <textarea
                      value={moodData.notes}
                      onChange={(e) =>
                        setMoodData({ ...moodData, notes: e.target.value })
                      }
                      maxLength={CHAR_LIMIT}
                      placeholder="How was your day? What made you feel the way you do?"
                      className="w-full h-32 p-4 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <CharLimitInfo value={moodData.notes} limit={CHAR_LIMIT} />
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <h2 className="text-lg font-semibold text-blue-900">
                        Private thoughts
                      </h2>
                      <div className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs flex items-center">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      This will be visible only to you
                    </p>
                    <textarea
                      value={moodData.privateNotes}
                      onChange={(e) =>
                        setMoodData({
                          ...moodData,
                          privateNotes: e.target.value,
                        })
                      }
                      maxLength={CHAR_LIMIT}
                      placeholder="Add any private thoughts you want to keep to yourself..."
                      className="w-full h-24 p-4 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <CharLimitInfo
                      value={moodData.privateNotes}
                      limit={CHAR_LIMIT}
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-blue-900 mb-4">
                      Add photos or videos
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {moodData.media.map((media, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-lg overflow-hidden border border-blue-200"
                        >
                          {media.type === "image" ? (
                            <img
                              src={media.url}
                              alt="Uploaded content"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                              <PlayCircle className="h-10 w-10 text-blue-500" />
                            </div>
                          )}
                          <button
                            onClick={() =>
                              setMoodData({
                                ...moodData,
                                media: moodData.media.filter(
                                  (_, i) => i !== index
                                ),
                              })
                            }
                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-50"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-blue-400 hover:bg-blue-50 transition"
                      >
                        <Upload className="h-8 w-8 mb-2" />
                        <span className="text-sm">Add media</span>
                        <span className="text-xs text-blue-300 mt-1">
                          Max 10MB
                        </span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    {mediaError && (
                      <p className="text-red-500 text-sm mt-2">{mediaError}</p>
                    )}
                  </div>

                  {moodData.media.length > 0 && !moodData.sharing.isPrivate && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-md font-medium text-blue-800 flex items-center">
                          <Share2 className="h-5 w-5 mr-2 text-blue-600" />
                          Share all media with connections
                        </h3>

                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={shareMediaWithAll}
                              onChange={toggleShareWithAll}
                            />
                            <div
                              className={`w-10 h-5 bg-blue-200 rounded-full shadow-inner ${
                                shareMediaWithAll ? "bg-blue-500" : ""
                              }`}
                            ></div>
                            <div
                              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                                shareMediaWithAll ? "translate-x-5" : ""
                              }`}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-blue-700">
                            {shareMediaWithAll ? "On" : "Off"}
                          </span>
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-3 mb-4">
                        {moodData.media.map((media, idx) => (
                          <div key={idx} className="relative">
                            {media.type === "image" ? (
                              <div className="h-16 w-16 border-2 border-blue-200 rounded-md overflow-hidden">
                                <img
                                  src={media.url}
                                  alt={`Media ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-16 w-16 bg-blue-50 border-2 border-blue-200 rounded-md flex items-center justify-center">
                                <PlayCircle className="h-8 w-8 text-blue-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="text-sm text-blue-600 flex items-start">
                        <Info className="h-4 w-4 mr-2 mt-0.5" />
                        <p>
                          {shareMediaWithAll
                            ? "All media will be automatically shared with your connections"
                            : "You can customize which media is shared with each connection"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-lg text-base font-semibold shadow-sm">
                      <span className="block mb-1">⚠️ Button Click Notice</span>
                      <span>
                        Sometimes the share button may not respond to clicks
                        immediately. If this happens, please try clicking on the
                        edges or corners of the button, or wait a moment and try
                        again. We appreciate your patience!
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-blue-900">
                        Share with
                      </h2>
                      <div className="flex items-center">
                        <label className="flex items-center text-sm text-blue-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moodData.sharing.isPrivate}
                            onChange={() =>
                              setMoodData({
                                ...moodData,
                                sharing: {
                                  ...moodData.sharing,
                                  isPrivate: !moodData.sharing.isPrivate,
                                  selectedConnections: moodData.sharing
                                    .isPrivate
                                    ? []
                                    : moodData.sharing.selectedConnections,
                                  selectedCircles: moodData.sharing.isPrivate
                                    ? []
                                    : moodData.sharing.selectedCircles,
                                },
                              })
                            }
                            className="sr-only"
                          />
                          <span
                            className={`w-10 h-5 mr-2 bg-blue-200 rounded-full flex items-center transition-all ${
                              moodData.sharing.isPrivate ? "bg-blue-600" : ""
                            }`}
                          >
                            <span
                              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                                moodData.sharing.isPrivate
                                  ? "translate-x-5"
                                  : "translate-x-1"
                              }`}
                            ></span>
                          </span>
                          Keep private
                        </label>
                      </div>
                    </div>

                    {!moodData.sharing.isPrivate && (
                      <>
                        <div className="mb-4">
                          <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-4">
                              <button
                                onClick={() => setActiveShareTab("connections")}
                                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                                  activeShareTab === "connections"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                              >
                                Individual Connections
                              </button>
                              <button
                                onClick={() => setActiveShareTab("circles")}
                                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                                  activeShareTab === "circles"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                              >
                                Micro Circles
                              </button>
                            </nav>
                          </div>
                        </div>

                        {activeShareTab === "connections" && (
                          <div>
                            <h3 className="text-md font-medium text-blue-800 mb-3 flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Choose connections to share with
                            </h3>

                            {isLoading ? (
                              <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div
                                  className="inline-block animate-spin h-5 w-5 border-2 border-blue-600 
                      border-t-transparent rounded-full mr-2"
                                ></div>
                                Loading connections...
                              </div>
                            ) : connections.length === 0 ? (
                              <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <p className="text-blue-700">
                                  No connections found
                                </p>
                              </div>
                            ) : (
                              <div className="bg-white border border-blue-200 rounded-lg divide-y divide-blue-100">
                                {connections.map((connection) => (
                                  <div
                                    key={connection._id}
                                    className="p-3 flex items-center justify-between"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden">
                                        {connection.profileImage ? (
                                          <img
                                            src={connection.profileImage}
                                            alt={connection.username || "User"}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-blue-500">
                                            <User className="h-5 w-5" />
                                          </div>
                                        )}
                                      </div>
                                      <span>
                                        {connection.username ||
                                          connection.email ||
                                          connection._id}
                                      </span>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <OptimizedCheckbox
                                        id={`conn-${connection._id}`}
                                        checked={moodData.sharing.selectedConnections.includes(
                                          connection._id
                                        )}
                                        onChange={() =>
                                          toggleConnectionShare(connection._id)
                                        }
                                        label="Share"
                                      />

                                      {moodData.sharing.selectedConnections.includes(
                                        connection._id
                                      ) && (
                                        <button
                                          onClick={() =>
                                            toggleConnectionCustomize(
                                              connection._id
                                            )
                                          }
                                          className="ml-2 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                                        >
                                          {customizeConnections.has(
                                            connection._id
                                          )
                                            ? "Hide"
                                            : "Customize"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {activeShareTab === "circles" && (
                          <div>
                            <h3 className="text-md font-medium text-blue-800 mb-3 flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              Choose micro circles to share with
                            </h3>

                            {microCirclesQuery.isLoading ? (
                              <div className="text-center p-4">
                                Loading circles...
                              </div>
                            ) : microCircles.length === 0 ? (
                              <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <p className="text-blue-700">
                                  No micro circles found
                                </p>
                              </div>
                            ) : (
                              <div className="bg-white border border-blue-200 rounded-lg divide-y divide-blue-100">
                                {microCircles.map((circle) => (
                                  <div
                                    key={circle._id}
                                    className="p-3 flex items-center justify-between"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div
                                        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white"
                                        style={{
                                          backgroundColor:
                                            circle.color || "#3B82F6",
                                        }}
                                      >
                                        <Users className="h-5 w-5" />
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          {circle.name}
                                        </span>
                                        <p className="text-xs text-gray-500">
                                          {circle.memberCount || 0} members
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <OptimizedCheckbox
                                        id={`circle-${circle._id}`}
                                        checked={moodData.sharing.selectedCircles.includes(
                                          circle._id
                                        )}
                                        onChange={() =>
                                          toggleCircleShare(circle._id)
                                        }
                                        label="Share"
                                      />

                                      {moodData.sharing.selectedCircles.includes(
                                        circle._id
                                      ) && (
                                        <button
                                          onClick={() =>
                                            toggleCircleCustomize(circle._id)
                                          }
                                          className="ml-2 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
                                        >
                                          {customizeCircles.has(circle._id)
                                            ? "Hide"
                                            : "Customize"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {connections.map(
                          (connection) =>
                            customizeConnections.has(connection._id) && (
                              <motion.div
                                key={`conn-customize-${connection._id}`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 overflow-hidden"
                              >
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h3 className="text-md font-medium text-blue-900 mb-3">
                                    Custom content for{" "}
                                    {connection.username ||
                                      connection.email ||
                                      "this connection"}
                                  </h3>

                                  <div className="mb-4">
                                    <label className="block text-sm text-blue-700 mb-1">
                                      Custom message
                                    </label>
                                    <textarea
                                      value={
                                        moodData.sharing.customVersions.find(
                                          (v) => v.userId === connection._id
                                        )?.notes || moodData.notes
                                      }
                                      onChange={(e) =>
                                        updateCustomVersion(
                                          connection._id,
                                          e.target.value
                                        )
                                      }
                                      maxLength={CHAR_LIMIT}
                                      placeholder="Customize what this person will see..."
                                      className="w-full h-24 p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <CharLimitInfo
                                      value={
                                        moodData.sharing.customVersions.find(
                                          (v) => v.userId === connection._id
                                        )?.notes || moodData.notes
                                      }
                                      limit={CHAR_LIMIT}
                                    />
                                  </div>

                                  {moodData.media.length > 0 && (
                                    <div>
                                      <label className="block text-sm text-blue-700 mb-1">
                                        Select media to share with this person:
                                      </label>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {moodData.media.map((media, idx) => {
                                          const customVersion =
                                            moodData.sharing.customVersions.find(
                                              (v) => v.userId === connection._id
                                            );

                                          const mediaIds =
                                            customVersion?.mediaIds || [];
                                          const isSelected = mediaIds.includes(
                                            media.id
                                          );

                                          return (
                                            <div
                                              key={idx}
                                              onClick={() =>
                                                toggleCustomMediaSelection(
                                                  connection._id,
                                                  idx
                                                )
                                              }
                                              className={`relative cursor-pointer border-2 rounded-md overflow-hidden transition-all ${
                                                isSelected
                                                  ? "border-blue-500 shadow-md"
                                                  : "border-gray-200 hover:border-blue-300"
                                              }`}
                                            >
                                              {media.type === "image" ? (
                                                <div className="h-16 w-16">
                                                  <img
                                                    src={media.url}
                                                    alt="Media preview"
                                                    className="h-full w-full object-cover"
                                                  />
                                                </div>
                                              ) : (
                                                <div className="h-16 w-16 bg-blue-50 flex items-center justify-center">
                                                  <PlayCircle className="h-8 w-8 text-blue-400" />
                                                </div>
                                              )}
                                              {isSelected && (
                                                <div className="absolute top-0 right-0 p-0.5 bg-blue-500 rounded-bl-md">
                                                  <Check className="h-3 w-3 text-white" />
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-2 text-sm text-blue-600">
                                    This custom content will only be visible to
                                    this specific person
                                  </div>
                                </div>
                              </motion.div>
                            )
                        )}

                        {microCircles.map(
                          (circle) =>
                            customizeCircles.has(circle._id) && (
                              <motion.div
                                key={`circle-customize-${circle._id}`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 overflow-hidden"
                              >
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h3 className="text-md font-medium text-blue-900 mb-3">
                                    Custom content for circle:{" "}
                                    <span className="text-blue-700">
                                      {circle.name}
                                    </span>
                                  </h3>

                                  <div className="mb-4">
                                    <label className="block text-sm text-blue-700 mb-1">
                                      Custom message for this circle
                                    </label>

                                    {(() => {
                                      const memberIds = circle.members.map(
                                        (m: { _id: string }) => m._id
                                      );
                                      const customNotes =
                                        moodData.sharing.circleCustomNotes.find(
                                          (v) =>
                                            Array.isArray(v.memberIds) &&
                                            v.memberIds.length ===
                                              memberIds.length &&
                                            v.memberIds.every((id) =>
                                              memberIds.includes(id)
                                            )
                                        );

                                      return (
                                        <>
                                          <textarea
                                            value={
                                              customNotes?.notes ||
                                              moodData.notes
                                            }
                                            onChange={(e) =>
                                              updateCircleCustomNotes(
                                                circle._id,
                                                e.target.value
                                              )
                                            }
                                            maxLength={CHAR_LIMIT}
                                            placeholder="Customize what members of this circle will see..."
                                            className="w-full h-24 p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          />
                                          <CharLimitInfo
                                            value={
                                              customNotes?.notes ||
                                              moodData.notes
                                            }
                                            limit={CHAR_LIMIT}
                                          />
                                        </>
                                      );
                                    })()}
                                  </div>

                                  {moodData.media.length > 0 && (
                                    <div>
                                      <label className="block text-sm text-blue-700 mb-1">
                                        Select media to share with this circle:
                                      </label>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {moodData.media.map((media, idx) => {
                                          const memberIds = circle.members.map(
                                            (m: { _id: string }) => m._id
                                          );
                                          const customCircleVersion =
                                            moodData.sharing.circleCustomNotes.find(
                                              (v) =>
                                                Array.isArray(v.memberIds) &&
                                                v.memberIds.length ===
                                                  memberIds.length &&
                                                v.memberIds.every((id) =>
                                                  memberIds.includes(id)
                                                )
                                            );
                                          const selectedMediaIds =
                                            customCircleVersion?.mediaIds || [];

                                          return (
                                            <label
                                              key={idx}
                                              className="cursor-pointer"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={selectedMediaIds.includes(
                                                  media.url
                                                )}
                                                onChange={() =>
                                                  toggleCircleMediaSelection(
                                                    circle._id,
                                                    idx
                                                  )
                                                }
                                                className="sr-only"
                                              />
                                              <div
                                                className={`relative border-2 rounded-md overflow-hidden ${
                                                  selectedMediaIds.includes(
                                                    media.id
                                                  )
                                                    ? "border-blue-500"
                                                    : "border-gray-200"
                                                }`}
                                              >
                                                {media.type === "image" ? (
                                                  <div className="h-16 w-16">
                                                    <img
                                                      src={media.url}
                                                      alt="Media preview"
                                                      className="h-full w-full object-cover"
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="h-16 w-16 bg-blue-50 flex items-center justify-center">
                                                    <PlayCircle className="h-8 w-8 text-blue-400" />
                                                  </div>
                                                )}
                                                {selectedMediaIds.includes(
                                                  media.id
                                                ) && (
                                                  <div className="absolute top-0 right-0 p-0.5 bg-blue-500 rounded-bl-md">
                                                    <Check className="h-3 w-3 text-white" />
                                                  </div>
                                                )}
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-4 text-sm">
                                    <div className="flex items-start">
                                      <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                                      <p className="text-blue-600">
                                        This custom content will only be visible
                                        to the
                                        {circle.memberCount || 0} members of
                                        this circle
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <Music className="h-5 w-5 mr-2" />
                      Share what you're listening to
                    </h2>

                    <div className="bg-white border border-blue-200 rounded-lg p-5">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          Platform
                        </label>
                        <select
                          value={moodData.music.platform}
                          onChange={(e) =>
                            setMoodData({
                              ...moodData,
                              music: {
                                ...moodData.music,
                                platform: e.target.value as any,
                              },
                            })
                          }
                          className="w-full p-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {MUSIC_PLATFORMS.map((platform) => (
                            <option key={platform.value} value={platform.value}>
                              {platform.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          Song link
                          <span className="text-blue-500 ml-1 text-xs">
                            (paste a link to a song)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={moodData.music.url}
                          onChange={handleMusicUrlChange}
                          placeholder="https://open.spotify.com/track/..."
                          className={`w-full p-2.5 border ${
                            musicUrlError
                              ? "border-red-300 bg-red-50"
                              : "border-blue-200"
                          } rounded-lg focus:outline-none focus:ring-2 ${
                            musicUrlError
                              ? "focus:ring-red-400"
                              : "focus:ring-blue-500"
                          } focus:border-transparent`}
                        />
                        {musicUrlError && (
                          <div className="mt-1 text-sm text-red-500 flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {musicUrlError}
                          </div>
                        )}
                        {musicUrlError && (
                          <div className="mt-2 text-xs text-blue-600">
                            You can still continue with this link, but it may
                            not display correctly.
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">
                          Title
                          <span className="text-blue-500 ml-1 text-xs">
                            (optional - will try to extract from link)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={moodData.music.title}
                          onChange={(e) =>
                            setMoodData({
                              ...moodData,
                              music: {
                                ...moodData.music,
                                title: e.target.value,
                              },
                            })
                          }
                          maxLength={2000}
                          placeholder="Song title"
                          className="w-full p-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <CharLimitInfo
                          value={moodData.music.title}
                          limit={2000}
                        />
                      </div>

                      {moodData.music.url && (
                        <div className="mt-4 pt-4 border-t border-blue-100">
                          <p className="text-sm text-blue-700 mb-2">Preview:</p>
                          <SafeUrlEmbed
                            url={moodData.music.url}
                            platform={moodData.music.platform}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-blue-900 mb-4">
                      Review your entry
                    </h2>

                    <div className="bg-white border border-blue-200 rounded-lg p-6">
                      <div className="mb-4">
                        <h3 className="text-md font-medium text-blue-800">
                          Mood
                        </h3>
                        <div className="flex items-center mt-2">
                          {
                            moodIcons.find(
                              (icon) => icon.value === moodData.mood
                            )?.icon
                          }
                          <span className="ml-2 text-blue-800">
                            {
                              moodIcons.find(
                                (icon) => icon.value === moodData.mood
                              )?.label
                            }
                          </span>
                        </div>
                      </div>

                      {moodData.activities.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-md font-medium text-blue-800">
                            Activities
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {moodData.activities.map((activity) => (
                              <div
                                key={activity}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                              >
                                {activity}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {moodData.notes && (
                        <div className="mb-4">
                          <h3 className="text-md font-medium text-blue-800">
                            Notes
                          </h3>
                          <p className="mt-2 text-blue-700 bg-blue-50 p-3 rounded-lg">
                            {moodData.notes}
                          </p>
                        </div>
                      )}

                      {moodData.media.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-md font-medium text-blue-800">
                            Media
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {moodData.media.map((media, idx) => (
                              <div
                                key={idx}
                                className="relative h-16 w-16 rounded-md overflow-hidden border border-blue-200"
                              >
                                {media.type === "image" ? (
                                  <img
                                    src={media.url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                                    <PlayCircle className="h-8 w-8 text-blue-400" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {moodData.music.url && (
                        <div className="mb-4">
                          <h3 className="text-md font-medium text-blue-800">
                            Music
                          </h3>
                          <div className="mt-2 bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center">
                              <Music className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="text-blue-700">
                                {moodData.music.title || moodData.music.url}
                              </span>
                            </div>
                            <div className="text-sm text-blue-500 mt-1">
                              via{" "}
                              {
                                MUSIC_PLATFORMS.find(
                                  (p) => p.value === moodData.music.platform
                                )?.label
                              }
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-md font-medium text-blue-800">
                          Sharing
                        </h3>
                        <div className="mt-2">
                          {moodData.sharing.isPrivate ? (
                            <div className="flex items-center text-blue-700">
                              <Lock className="h-4 w-4 mr-2" />
                              Private - visible only to you
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center text-blue-700">
                                <Share2 className="h-4 w-4 mr-2" />
                                Shared with{" "}
                                {moodData.sharing.selectedConnections.length +
                                  moodData.sharing.selectedCircles.length}{" "}
                                recipients
                              </div>

                              {moodData.sharing.selectedConnections.length >
                                0 && (
                                <div className="mt-2 text-sm text-blue-600">
                                  {moodData.sharing.selectedConnections.length}{" "}
                                  individual connections
                                  {moodData.sharing.customVersions.length > 0 &&
                                    ` (${moodData.sharing.customVersions.length} customized)`}
                                </div>
                              )}

                              {moodData.sharing.selectedCircles.length > 0 && (
                                <div className="mt-1 text-sm text-blue-600">
                                  {moodData.sharing.selectedCircles.length}{" "}
                                  micro circles
                                  {moodData.sharing.circleCustomNotes.length >
                                    0 &&
                                    ` (${moodData.sharing.circleCustomNotes.length} customized)`}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="px-6 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                      disabled={submitting}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center ${
                        submitting ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Entry
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {step > 0 && (
          <div
            className={clsx(
              "flex justify-between items-center shrink-0",
              "fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-blue-100 shadow-md",
              "sm:static sm:border-t-0 sm:shadow-none sm:p-0 sm:mt-6"
            )}
          ></div>
        )}
      </div>
    </div>
  );
}

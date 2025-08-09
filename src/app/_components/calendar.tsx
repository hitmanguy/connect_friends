import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import ViewMoodEntry from "./viewmood";

type UserRef = {
  _id?: string;
  username: string;
  profileImage?: string;
  email?: string;
};

type MoodEntry = {
  _id: string;
  date: string | Date;
  localDate: string;
  timezone?: string;
  mood: number;
  notes: string;
  activities?: string[];
  media?: { url: string; type: string }[];
  music?: { title?: string; url?: string; platform?: string };
  isPrivate?: boolean;
  user?: UserRef;
  privateNotes?: string;
  sharing?: {
    isPrivate?: boolean;
    sharedWith?: UserRef[];
    customVersions?: {
      user: UserRef;
      notes: string;
      userId?: string;
      mediaUrls?: string[];
    }[];
    sharedWithCircles?: {
      members: UserRef[];
      customNotes?: string;
      circleId?: string;
      mediaUrls?: string[];
    }[];
  };
  customVersion?: {
    notes?: string;
    mediaUrls?: string[];
  };
};

type MoodCalendarProps = {
  month: number;
  year: number;
  myEntries: MoodEntry[];
  receivedEntries: MoodEntry[];
};

const moodColors = [
  "bg-blue-100 border-blue-200",
  "bg-blue-200 border-blue-300",
  "bg-blue-300 border-blue-400",
  "bg-blue-400 border-blue-500 text-white",
  "bg-blue-600 border-blue-700 text-white",
];

function UserAvatar({ user }: { user: UserRef }) {
  const px = `w-12 h-12`;

  if (!user) {
    return (
      <div
        className={clsx(
          px,
          "rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200"
        )}
      >
        ?
      </div>
    );
  }

  if (user.profileImage && user.profileImage.trim() !== "") {
    return (
      <img
        src={user.profileImage}
        alt={user.username || "User"}
        className={clsx(px, "rounded-full border border-blue-200 object-cover")}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          const parent = e.currentTarget.parentElement;
          if (parent) {
            const fallback = document.createElement("div");
            fallback.className = `${px} rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200`;
            fallback.textContent = (user.username?.[0] || "?").toUpperCase();
            parent.appendChild(fallback);
          }
        }}
      />
    );
  }

  return (
    <div
      className={clsx(
        px,
        "rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200"
      )}
    >
      {user.username && user.username.length > 0
        ? user.username[0].toUpperCase()
        : "?"}
    </div>
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getWeekday(year: number, month: number, day: number) {
  return new Date(year, month, day).getDay();
}

export default function MoodCalendar({
  month,
  year,
  myEntries,
  receivedEntries,
}: MoodCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalIndex, setModalIndex] = useState(0);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [viewDetailIndex, setViewDetailIndex] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [isViewingReceivedMood, setIsViewingReceivedMood] = useState(false);

  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const myEntryMap = useMemo(() => {
    const map: Record<string, MoodEntry> = {};
    myEntries.forEach((e) => {
      if (e.localDate) map[e.localDate] = e;
    });
    return map;
  }, [myEntries]);

  const receivedEntryMap = useMemo(() => {
    const map: Record<string, MoodEntry[]> = {};
    receivedEntries.forEach((e) => {
      if (e.localDate) {
        if (!map[e.localDate]) map[e.localDate] = [];
        map[e.localDate].push(e);
      }
    });
    return map;
  }, [receivedEntries]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getWeekday(year, month, 1);

  const allDaysWithEntries = useMemo(() => {
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const localDateStr = format(dateObj, "yyyy-MM-dd");
      if (myEntryMap[localDateStr] || receivedEntryMap[localDateStr])
        days.push(d);
    }
    return days;
  }, [daysInMonth, year, month, myEntryMap, receivedEntryMap, timezone]);

  const modalDay = selectedDay ?? allDaysWithEntries[modalIndex] ?? null;
  const modalDateObj = modalDay ? new Date(year, month, modalDay) : undefined;
  const modalLocalDateStr = modalDateObj
    ? format(modalDateObj, "yyyy-MM-dd")
    : undefined;

  const modalMyEntry = modalLocalDateStr
    ? myEntryMap[modalLocalDateStr]
    : undefined;
  const modalReceived = modalLocalDateStr
    ? receivedEntryMap[modalLocalDateStr] ?? []
    : [];

  const calendarCells: React.ReactNode[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    calendarCells.push(<div key={`empty-${i}`} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const localDateStr = format(dateObj, "yyyy-MM-dd");
    const myEntry = myEntryMap[localDateStr];
    const received = receivedEntryMap[localDateStr];

    calendarCells.push(
      <button
        key={d}
        className={clsx(
          "aspect-square rounded-lg border flex flex-col items-center justify-center transition-all duration-150 px-1 py-1 relative group bg-white hover:bg-blue-50 hover:shadow-md hover:scale-[1.03] hover:z-10",
          "sm:h-24 sm:px-2 sm:py-2",
          "h-12 min-h-[48px] max-h-[60px] text-sm",
          myEntry ? moodColors[(myEntry.mood || 3) - 1] : "border-blue-100",
          selectedDay === d ? "ring-2 ring-blue-400" : ""
        )}
        style={{
          minWidth: 0,
          minHeight: 0,
          gridColumn: "span 1",
        }}
        onClick={() => {
          setSelectedDay(d);
          setModalIndex(allDaysWithEntries.indexOf(d));
          setActiveTabIndex(0);
        }}
        aria-label={`Day ${d}`}
      >
        <span className="font-bold text-blue-900 text-base sm:text-base">
          {d}
        </span>
        {myEntry && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-blue-600" />
        )}
        {Array.isArray(received) && received.length > 0 && (
          <span className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-sky-400" />
        )}
      </button>
    );
  }

  {
    calendarCells.map((_, index) => {
      const d = index - firstWeekday + 1;
      if (d < 1 || d > daysInMonth) return <div key={`empty-${index}`} />;

      const dateObj = new Date(year, month, d);
      const localDateStr = format(dateObj, "yyyy-MM-dd");
      const myEntry = myEntryMap[localDateStr];
      const received = receivedEntryMap[localDateStr];

      return (
        <button
          key={d}
          className={clsx(
            "relative flex transition-all duration-150",
            "h-10 w-10 max-h-[40px]",
            "sm:aspect-square sm:h-24 sm:w-auto",
            "rounded-lg border flex flex-col items-center justify-center",
            "bg-white hover:bg-blue-50 hover:shadow-md hover:z-10",
            myEntry ? moodColors[(myEntry.mood || 3) - 1] : "border-blue-100",
            selectedDay === d ? "ring-2 ring-blue-400" : ""
          )}
          style={{ minWidth: 0, minHeight: 0 }}
          onClick={() => {
            setSelectedDay(d);
            setModalIndex(allDaysWithEntries.indexOf(d));
            setActiveTabIndex(0);
          }}
          aria-label={`Day ${d}`}
        >
          <span className="font-bold text-blue-900 text-sm sm:text-base">
            {d}
          </span>

          <div className="absolute right-0 bottom-0 flex flex-col gap-0.5">
            {myEntry && (
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-600" />
            )}
            {Array.isArray(received) && received.length > 0 && (
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-sky-400" />
            )}
          </div>
        </button>
      );
    });
  }

  const handlePrev = () => {
    if (modalIndex > 0) {
      setModalIndex(modalIndex - 1);
      setSelectedDay(allDaysWithEntries[modalIndex - 1]);
      setActiveTabIndex(0);
    }
  };
  const handleNext = () => {
    if (modalIndex < allDaysWithEntries.length - 1) {
      setModalIndex(modalIndex + 1);
      setSelectedDay(allDaysWithEntries[modalIndex + 1]);
      setActiveTabIndex(0);
    }
  };

  function mapEntryToViewFormat(entry: MoodEntry) {
    console.log("Mapping entry:", entry);
    return {
      _id: entry._id,
      date: entry.date,
      mood: entry.mood,
      activities: entry.activities || [],
      notes: entry.notes || null,
      privateNotes: entry.privateNotes || null,
      media: (entry.media || []).map((m) => ({
        url: m.url,
        type: m.type as "image" | "video",
        _id: undefined,
      })),
      music:
        entry.music != null
          ? {
              title: entry.music.title || null,
              url: entry.music.url || null,
              platform: (entry.music.platform as any) || null,
            }
          : null,
      sharing: {
        isPrivate: entry.sharing?.isPrivate,
        sharedWith: (entry.sharing?.sharedWith || []).map((user) => ({
          _id: user._id || "",
          username: user.username || "Unknown",
          email: user.email || "",
          profileImage: user.profileImage || "",
        })),
        customVersions: (entry.sharing?.customVersions || []).map(
          (version) => ({
            userId: version.userId || "",
            user: {
              username: version.user?.username || "Unknown",
              profileImage: version.user?.profileImage || "",
            },
            notes: version.notes || "",
            mediaUrls: Array.isArray(version.mediaUrls)
              ? version.mediaUrls
              : [],
          })
        ),
        sharedWithCircles:
          (entry.sharing?.sharedWithCircles || []).map((circle) => ({
            circleId: circle.circleId || "",
            customNotes: circle.customNotes,
            mediaUrls: Array.isArray(circle.mediaUrls) ? circle.mediaUrls : [],
            members: circle.members || [],
          })) || [],
      },
      username: entry.user?.username || "Unknown",
      profileImage: entry.user?.profileImage || "",
      isReceived: isViewingReceivedMood,
      customVersion: entry.customVersion
        ? {
            notes: entry.customVersion.notes || "",
            mediaUrls: Array.isArray(entry.customVersion.mediaUrls)
              ? entry.customVersion.mediaUrls
              : [],
          }
        : undefined,
    };
  }
  const handleCloseModal = () => {
    setSelectedEntry(null);
  };

  return (
    <div
      className={clsx(
        "bg-white border-blue-200 shadow-xl flex flex-col justify-center transition-all duration-200",
        "fixed inset-0 border-0 rounded-none p-1 z-40 overflow-auto",
        "sm:relative sm:border-2 sm:rounded-xl sm:p-8 sm:w-full sm:max-w-4xl sm:mx-auto sm:min-h-[650px] sm:z-auto" // Desktop: Card
      )}
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-sky-700 mb-4 sm:mb-8 text-center tracking-tight">
        Mood Calendar
      </h2>
      <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-2 sm:mb-4 text-blue-700 font-semibold text-center text-xs sm:text-base">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>
      <div
        className={clsx(
          "grid grid-cols-7 gap-1 sm:gap-3 w-full",
          "min-h-[300px] sm:min-h-[420px]"
        )}
      >
        {calendarCells}
      </div>
      <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-base text-blue-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          My mood entry
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" />
          Received mood
        </div>
      </div>

      {selectedDay !== null && (
        <div className="fixed inset-0 z-50 bg-blue-900/30 flex items-center justify-center backdrop-blur-sm p-4">
          {activeTabIndex === 0 && (
            <div className="bg-white border-2 border-blue-200 rounded-xl shadow-2xl p-4 sm:p-8 max-w-xs sm:max-w-xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                className="absolute top-2 right-2 sm:top-4 sm:right-4 text-blue-400 hover:text-blue-700"
                onClick={() => setSelectedDay(null)}
                aria-label="Close"
              >
                <X className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <button
                  className={clsx(
                    "p-1 sm:p-2 rounded-full hover:bg-blue-50 transition",
                    modalIndex === 0 && "opacity-30 pointer-events-none"
                  )}
                  onClick={handlePrev}
                  aria-label="Previous day"
                  disabled={modalIndex === 0}
                >
                  <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
                <div className="text-base sm:text-xl font-bold text-sky-700 tracking-wide">
                  {modalLocalDateStr}
                </div>
                <button
                  className={clsx(
                    "p-1 sm:p-2 rounded-full hover:bg-blue-50 transition",
                    modalIndex === allDaysWithEntries.length - 1 &&
                      "opacity-30 pointer-events-none"
                  )}
                  onClick={handleNext}
                  aria-label="Next day"
                  disabled={modalIndex === allDaysWithEntries.length - 1}
                >
                  <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </div>
              <div className="space-y-4 sm:space-y-6">
                {modalMyEntry && (
                  <div
                    className="border border-blue-200 rounded-lg p-4 sm:p-6 bg-white cursor-pointer hover:bg-blue-50 transition shadow"
                    onClick={() => {
                      setActiveTabIndex(1);
                      setViewDetailIndex(null);
                    }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-2">
                      <span
                        className={clsx(
                          "inline-block w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 shadow",
                          moodColors[(modalMyEntry.mood || 3) - 1]
                        )}
                      />
                      <span className="font-semibold text-blue-900 text-base sm:text-lg">
                        Your mood: {modalMyEntry.mood}
                      </span>
                    </div>
                    <div className="text-blue-800 truncate text-xs sm:text-base">
                      <span className="font-semibold">Notes:</span>{" "}
                      {modalMyEntry.notes}
                    </div>

                    <div className="text-xs text-blue-400 mt-2">
                      Tap for full details
                    </div>
                  </div>
                )}

                {Array.isArray(modalReceived) && modalReceived.length > 0 && (
                  <div>
                    <div className="font-semibold text-blue-700 mb-2 text-xs sm:text-base">
                      MoodTrackers received from others:
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      {modalReceived.map((entry, idx) => (
                        <div
                          key={entry._id}
                          className="border border-sky-200 rounded-lg p-3 sm:p-4 bg-white cursor-pointer hover:bg-sky-50 transition shadow"
                          onClick={() => {
                            setActiveTabIndex(1);
                            setViewDetailIndex(idx);
                          }}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex-shrink-0">
                              <UserAvatar
                                user={entry.user || { username: "?" }}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-blue-900 text-sm truncate block">
                                {entry.user?.username}
                              </span>
                              <div className="flex items-center gap-1 mt-1">
                                <span
                                  className="inline-block w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex-shrink-0"
                                  style={{
                                    backgroundColor: [
                                      "#DBEAFE",
                                      "#93C5FD",
                                      "#60A5FA",
                                      "#3B82F6",
                                      "#2563EB",
                                    ][(entry.mood || 3) - 1],
                                    borderColor: [
                                      "#BFDBFE",
                                      "#60A5FA",
                                      "#3B82F6",
                                      "#2563EB",
                                      "#1D4ED8",
                                    ][(entry.mood || 3) - 1],
                                  }}
                                />
                                <span className="text-blue-800 text-sm">
                                  Mood: {entry.mood}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-blue-800">
                            <span className="font-medium">Notes:</span>{" "}
                            <span
                              className={`text-blue-600 ${
                                entry.notes && entry.notes.length > 100
                                  ? "line-clamp-2"
                                  : ""
                              }`}
                            >
                              {entry.notes || "No notes"}
                            </span>
                          </div>

                          <div className="text-xs text-blue-400 mt-2 text-right">
                            Tap for full details
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!modalMyEntry &&
                  (!modalReceived || modalReceived.length === 0) && (
                    <div className="text-blue-500 text-center py-8 sm:py-10 text-xs sm:text-base font-semibold">
                      No mood tracker entry for this day.
                    </div>
                  )}
              </div>
            </div>
          )}

          {activeTabIndex === 1 && (
            <div
              className={clsx(
                "bg-white shadow-2xl overflow-hidden",
                "fixed inset-0 z-50 rounded-none",
                "sm:relative sm:bg-white/40 sm:backdrop-blur-sm sm:rounded-xl sm:w-full sm:max-w-4xl sm:max-h-[90vh] sm:overflow-y-auto"
              )}
            >
              <div className="sticky top-0 z-20 w-full bg-white border-b border-blue-100 flex items-center justify-between p-3 sm:p-4">
                <button
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium shadow-sm flex items-center text-sm sm:text-base"
                  onClick={() => setActiveTabIndex(0)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
                <div className="text-sm sm:text-lg font-bold text-sky-700 tracking-wide">
                  {modalLocalDateStr}
                </div>
                <button
                  className="p-1.5 sm:p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                  onClick={() => setSelectedDay(null)}
                  aria-label="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="overflow-y-auto h-[calc(100vh-56px)] sm:h-auto sm:max-h-[70vh]">
                <div className="p-3 sm:p-4">
                  {viewDetailIndex === null && modalMyEntry && (
                    <ViewMoodEntry
                      moodEntry={{
                        ...mapEntryToViewFormat(modalMyEntry),
                        isReceived: false,
                      }}
                      isLoading={false}
                      isEmbedded={true}
                    />
                  )}

                  {viewDetailIndex !== null &&
                    modalReceived &&
                    viewDetailIndex < modalReceived.length && (
                      <div>
                        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm flex items-center">
                          <div className="flex-shrink-0">
                            <UserAvatar
                              user={{
                                username:
                                  modalReceived[viewDetailIndex]?.user
                                    ?.username || "Unknown",
                                profileImage:
                                  modalReceived[viewDetailIndex]?.user
                                    ?.profileImage || "",
                                _id:
                                  modalReceived[viewDetailIndex]?.user?._id ||
                                  "",
                              }}
                            />
                          </div>
                          <span className="font-bold text-blue-900 ml-3 text-base truncate max-w-[250px]">
                            {modalReceived[viewDetailIndex]?.user?.username ||
                              "Unknown User"}
                          </span>
                        </div>

                        <ViewMoodEntry
                          moodEntry={{
                            ...mapEntryToViewFormat(
                              modalReceived[viewDetailIndex]
                            ),
                            isReceived: true,
                          }}
                          isLoading={false}
                          isEmbedded={true}
                        />
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-xl shadow-lg">
              <div className="flex justify-end p-2">
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-red-100 rounded-full"
                >
                  ✕
                </button>
              </div>
              <ViewMoodEntry
                moodEntry={mapEntryToViewFormat(selectedEntry)}
                isLoading={false}
                isEmbedded={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

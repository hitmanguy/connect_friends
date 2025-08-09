"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { trpc } from "../../../../utils/providers/TrpcProviders";

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const FEED_LIMIT = 15;
const HOUR_PX = 64;
const NOTE_CHAR_LIMIT = 5000;

const minutesToLabel = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${mm.toString().padStart(2, "0")} ${ampm}`;
};

function shiftDay(d: string, delta: number) {
  const [y, m, dd] = d.split("-").map((s) => parseInt(s, 10));
  const date = new Date(y, m - 1, dd);
  date.setDate(date.getDate() + delta);
  return dayKey(date);
}

// ===================================================
// Feed (Conversations)
// ===================================================

type FeedMsg = {
  id: string;
  conversationId: string;
  authorName: string;
  authorAvatar?: string;
  text?: string;
  createdAt: number;
  media?: { type: "image" | "video" | "file"; url: string }[];
};

function FeaturedCard({ item }: { item: FeedMsg }) {
  const media = item.media?.[0];
  return (
    <article className="rounded-2xl border bg-white shadow-sm overflow-hidden group">
      {media && (media.type === "image" || media.type === "video") ? (
        <div className="relative h-80 overflow-hidden bg-slate-100">
          {media.type === "image" ? (
            <img
              src={media.url}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.01]"
              alt="media"
            />
          ) : (
            <video
              className="w-full h-full object-contain bg-black"
              src={media.url}
              controls
            />
          )}
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
            <span className="text-[11px] font-medium text-sky-700">
              {item.authorName[0]?.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-800">{item.authorName}</span>{" "}
            • {new Date(item.createdAt).toLocaleString()}
          </div>
        </div>

        {item.text && (
          <p className="mt-2 text-gray-700 line-clamp-3 rounded-md p-1 break-words">
            {item.text}
          </p>
        )}
      </div>
    </article>
  );
}

function FeedListItem({ item }: { item: FeedMsg }) {
  const media = item.media?.[0];
  return (
    <article className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-medium text-sky-700">
            {item.authorName[0]?.toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-800">{item.authorName}</span>{" "}
            • {new Date(item.createdAt).toLocaleString()}
          </div>
          {item.text && (
            <p className="text-sm text-gray-700 mt-1 break-words">
              {item.text}
            </p>
          )}
          {media && (media.type === "image" || media.type === "video") && (
            <div className="mt-2 rounded-lg overflow-hidden h-44 bg-slate-100">
              {media.type === "image" ? (
                <img
                  src={media.url}
                  className="w-full h-full object-contain"
                  alt="media"
                />
              ) : (
                <video
                  className="w-full h-full object-contain bg-black"
                  src={media.url}
                  controls
                />
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ConversationsFeed() {
  const [mediaFirst, setMediaFirst] = useState(true);
  const convosQ = trpc.conversation.getMyConversations.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const feed = useMemo<FeedMsg[]>(() => {
    const convs = (convosQ.data as any[]) ?? [];
    const items: FeedMsg[] = [];
    for (const c of convs) {
      const last = Array.isArray(c.messages)
        ? c.messages[c.messages.length - 1]
        : null;
      if (!last) continue;
      const author = last.sender?.username || "User";
      const media = Array.isArray(last.attachments) ? last.attachments : [];
      items.push({
        id: `${c._id}_${last._id || last.createdAt}`,
        conversationId: String(c._id),
        authorName: author,
        authorAvatar: last.sender?.profileImage,
        text: last.content || "",
        media,
        createdAt: new Date(
          last.createdAt || c.updatedAt || Date.now()
        ).getTime(),
      });
    }
    const sorted = items.sort((a, b) => {
      if (mediaFirst) {
        const am = Number(!!(a.media && a.media.length));
        const bm = Number(!!(b.media && b.media.length));
        if (bm - am !== 0) return bm - am;
      }
      return b.createdAt - a.createdAt;
    });
    return sorted.slice(0, FEED_LIMIT);
  }, [convosQ.data, mediaFirst]);

  const featured = feed.find((f) => (f.media?.length ?? 0) > 0) ?? feed[0];
  const others = feed.filter((f) => f.id !== featured?.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-xl font-semibold text-sky-700">
          Recent Conversations
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mediaFirst}
            onChange={(e) => setMediaFirst(e.target.checked)}
          />
          Media First
        </label>
      </div>

      {featured && <FeaturedCard item={featured} />}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {others.map((it) => (
          <FeedListItem key={it.id} item={it} />
        ))}
      </div>

      {!feed.length && (
        <div className="rounded-xl border bg-slate-50/60 p-8 text-center text-gray-600 mt-3">
          No conversations yet.
        </div>
      )}
    </div>
  );
}

// ===================================================
// Notes
// ===================================================

type StrokePoint = { x: number; y: number };
type Stroke = { points: StrokePoint[] };
type NoteDoc = {
  _id: string;
  day: string;
  text: string;
  lines: Stroke[];
  updatedAt?: string | Date;
};

function NotesStrip() {
  const [all, setAll] = useState(false);
  const [day, setDay] = useState(dayKey());
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<NoteDoc | null>(null);

  const listQ = trpc.notes.list.useQuery(
    { day, all },
    { refetchOnWindowFocus: false }
  );
  const createM = trpc.notes.create.useMutation();
  const removeM = trpc.notes.remove.useMutation();

  const notes: NoteDoc[] = useMemo(
    () =>
      Array.isArray(listQ.data?.notes)
        ? (listQ.data!.notes as any[]).map((n) => ({
            ...n,
            _id: n._id?.toString?.() ?? n._id,
          }))
        : [],
    [listQ.data?.notes]
  );

  return (
    <section className="rounded-2xl border bg-white p-3 md:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-sky-700">Notes</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="px-2 py-1 rounded-md border"
            onClick={() => setDay((d) => shiftDay(d, -1))}
            title="Previous day"
          >
            ◀
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="px-2 py-1 rounded-md border text-sm w-[150px]"
          />
          <button
            className="px-2 py-1 rounded-md border"
            onClick={() => setDay((d) => shiftDay(d, +1))}
            title="Next day"
          >
            ▶
          </button>
          <button
            className="px-2 py-1 rounded-md border"
            onClick={() => setDay(dayKey())}
          >
            Today
          </button>
          <label className="inline-flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={all}
              onChange={(e) => setAll(e.target.checked)}
            />
            <span>All</span>
          </label>
          <button
            className="ml-auto px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-sm"
            onClick={() => setCreateOpen(true)}
          >
            + New
          </button>
        </div>
      </div>

      <div className="mt-3">
        {listQ.isLoading ? (
          <div className="h-40 flex items-center justify-center text-gray-500">
            Loading…
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border bg-slate-50/60 p-8 text-center text-gray-600">
            No notes for selected scope.
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 min-h-[22rem] pr-2">
              {notes.map((n) => (
                <article
                  key={n._id}
                  className="w-80 flex-shrink-0 rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="px-3 pt-2 text-[11px] text-gray-500 flex items-center justify-between">
                    <span className="truncate">
                      {new Date(n.updatedAt ?? Date.now()).toLocaleString()}
                    </span>
                    <span className="font-medium">{n.day}</span>
                  </div>
                  <div className="px-3 mt-1 text-sm text-gray-800 break-words overflow-hidden max-h-28">
                    {n.text || (
                      <span className="text-gray-400">[drawing only]</span>
                    )}
                  </div>
                  <div className="mt-2 px-3 pb-3">
                    <PreviewCanvas lines={n.lines} />
                  </div>
                  <div className="mt-auto flex items-center gap-2 border-t px-3 py-2">
                    <button
                      className="text-sm text-sky-700 hover:underline"
                      onClick={() => setView(n)}
                    >
                      Open
                    </button>
                    <button
                      className="ml-auto text-sm text-red-600 hover:underline"
                      onClick={() =>
                        removeM.mutate(
                          { id: n._id },
                          { onSuccess: () => listQ.refetch() }
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateModal
          day={day}
          onClose={() => setCreateOpen(false)}
          onSave={async (payload) => {
            await createM.mutateAsync({ day, ...payload });
            setCreateOpen(false);
            listQ.refetch();
          }}
        />
      )}

      {view && <PreviewModal note={view} onClose={() => setView(null)} />}
    </section>
  );
}

function PreviewCanvas({ lines }: { lines: Stroke[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const s of lines) {
      const pts = s.points;
      if (!pts || pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * c.width, pts[0].y * c.height);
      for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i].x * c.width, pts[i].y * c.height);
      ctx.stroke();
    }
  }, [lines]);

  return (
    <canvas
      ref={ref}
      width={560}
      height={160}
      className="w-full h-40 rounded-md border bg-white"
    />
  );
}

function PreviewModal({
  note,
  onClose,
}: {
  note: NoteDoc;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl border max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur border-b rounded-t-2xl">
          <div className="font-semibold text-slate-800">Note</div>
          <button className="px-3 py-1.5 rounded-md border" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-3 min-h-44">
            <div className="text-xs text-gray-600 mb-1">Text</div>
            <div className="text-sm whitespace-pre-wrap break-words">
              {note.text || "—"}
            </div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600 mb-1">Drawing</div>
            <PreviewCanvas lines={note.lines} />
          </div>
        </div>
        <div className="px-4 pb-4 text-xs text-gray-500">Date: {note.day}</div>
      </div>
    </div>
  );
}

function CreateModal({
  day,
  onClose,
  onSave,
}: {
  day: string;
  onClose: () => void;
  onSave: (payload: { text: string; lines: Stroke[] }) => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Stroke[]>([]);

  const chars = text.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl border max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur border-b rounded-t-2xl">
          <div className="font-semibold text-slate-800">New Note</div>
          <button className="px-3 py-1.5 rounded-md border" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-600 mb-1">Text</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-44 md:h-72 border rounded-md p-2 text-sm"
              placeholder={`Type your note… (max ${NOTE_CHAR_LIMIT} characters)`}
              maxLength={NOTE_CHAR_LIMIT}
            />
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Canvas (black pen)</div>
            <DrawingCanvas value={lines} onChange={setLines} />
            <div className="mt-2">
              <button
                className="px-2 py-1 rounded-md border text-sm"
                onClick={() => setLines([])}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex justify-end">
          <button
            className="px-3 py-1.5 rounded-md bg-sky-600 text-white"
            onClick={() => onSave({ text: text.trim(), lines })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawingCanvas({
  value,
  onChange,
}: {
  value: Stroke[];
  onChange: (v: Stroke[]) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  const redraw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    value.forEach((s) => {
      const pts = s.points;
      if (!pts || pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * c.width, pts[0].y * c.height);
      for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i].x * c.width, pts[i].y * c.height);
      ctx.stroke();
    });
  }, [value]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const clamp = (v: number, a: number, b: number) =>
    Math.min(b, Math.max(a, v));

  const getNorm = (ev: React.PointerEvent) => {
    const c = ref.current!;
    const rect = c.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    onChange([...value, { points: [getNorm(e)] }]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const v = [...value];
    const last = v[v.length - 1];
    if (!last) return;
    last.points.push(getNorm(e));
    onChange(v);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drawing.current = false;
    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={ref}
      width={560}
      height={240}
      className="w-full h-60 border rounded-md bg-white touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}

// ===================================================
// Scheduler
// ===================================================

type TaskDoc = {
  _id: string;
  title: string;
  description?: string;
  day: string;
  startMin: number;
  endMin: number;
  category: "work" | "personal" | "break" | "custom";
  priority: "low" | "medium" | "high";
  color?: string;
  tags?: string[];
  done?: boolean;
};

function SchedulerToday() {
  const today = dayKey();

  const SLOT = 15;
  const START = 6 * 60;
  const END = 23 * 60;
  const RANGE = END - START;

  const listQ = trpc.tracker.listDay.useQuery(
    { day: today },
    { refetchOnWindowFocus: false }
  );
  const createM = trpc.tracker.create.useMutation();
  const updateM = trpc.tracker.update.useMutation();
  const toggleM = trpc.tracker.toggleDone.useMutation();
  const removeM = trpc.tracker.remove.useMutation();

  const tasks = (listQ.data?.tasks as TaskDoc[] | undefined) ?? [];

  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const [showAdd, setShowAdd] = useState(false);
  const [focus, setFocus] = useState<TaskDoc | null>(null);

  type DragState = null | {
    id: string;
    mode: "move" | "resizeTop" | "resizeBottom";
    startMin: number;
    endMin: number;
    grabOffset?: number;
  };
  const [drag, setDrag] = useState<DragState>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const justDraggedRef = useRef(false);

  const clamp = (v: number, a: number, b: number) =>
    Math.min(b, Math.max(a, v));
  const snap = (m: number) => Math.round(m / SLOT) * SLOT;

  const beginPointer = (
    e: React.PointerEvent,
    t: TaskDoc,
    mode: "move" | "resizeTop" | "resizeBottom"
  ) => {
    if (e.pointerType === "touch") return;
    const area = areaRef.current;
    if (!area) return;
    area.setPointerCapture(e.pointerId);
    const rect = area.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const m = START + (y / rect.height) * RANGE;
    const grabOffset = m - t.startMin;
    justDraggedRef.current = false;
    setDrag({
      id: t._id,
      mode,
      startMin: t.startMin,
      endMin: t.endMin,
      grabOffset,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || e.pointerType === "touch") return;
    justDraggedRef.current = true;
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const m = START + (y / rect.height) * RANGE;
    if (drag.mode === "move") {
      const dur = drag.endMin - drag.startMin;
      let s = snap(clamp(m - (drag.grabOffset ?? 0), START, END - dur));
      let eMin = s + dur;
      if (eMin > END) {
        eMin = END;
        s = END - dur;
      }
      setDrag({ ...drag, startMin: s, endMin: eMin });
    } else if (drag.mode === "resizeTop") {
      const s = snap(clamp(m, START, drag.endMin - SLOT));
      setDrag({ ...drag, startMin: s });
    } else if (drag.mode === "resizeBottom") {
      const eMin = snap(clamp(m, drag.startMin + SLOT, END));
      setDrag({ ...drag, endMin: eMin });
    }
  };

  const onPointerUp = () => {
    if (!drag) return;
    const t = tasks.find((x) => x._id === drag.id);
    const changed =
      !!t && (t.startMin !== drag.startMin || t.endMin !== drag.endMin);
    setDrag(null);
    if (t && changed) {
      updateM.mutate(
        { id: t._id, patch: { startMin: drag.startMin, endMin: drag.endMin } },
        { onSuccess: () => listQ.refetch() }
      );
    }
    setTimeout(() => (justDraggedRef.current = false), 0);
  };

  const colorFor = (t: TaskDoc) => {
    if (t.color) return t.color;
    switch (t.category) {
      case "work":
        return "#bfdbfe"; //blue
      case "personal":
        return "#fde68a"; // yellow
      case "break":
        return "#bbf7d0"; // green
      default:
        return "#e9d5ff"; // purple
    }
  };
  const borderFor = (p: TaskDoc["priority"]) =>
    p === "high"
      ? "border-red-500"
      : p === "medium"
      ? "border-amber-500"
      : "border-slate-300";

  return (
    <section className="rounded-2xl border bg-white p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sky-700">Today’s Schedule</h3>
        <button
          className="px-3 py-1.5 rounded-md bg-sky-600 text-white text-sm"
          onClick={() => setShowAdd(true)}
        >
          + Add Task
        </button>
      </div>

      <div className="relative grid grid-cols-[56px_1fr] gap-3 max-h-[480px] overflow-auto">
        <div className="pr-1" aria-hidden>
          <div className="relative" style={{ height: HOUR_PX * (RANGE / 60) }}>
            {Array.from({ length: Math.floor(RANGE / 60) + 1 }).map((_, i) => {
              const m = START + i * 60;
              return (
                <div
                  key={m}
                  className="h-16 text-[11px] text-gray-500 flex items-start justify-end pr-1"
                >
                  {minutesToLabel(m)}
                </div>
              );
            })}
          </div>
        </div>

        <div
          ref={areaRef}
          className="relative rounded-lg border bg-slate-50/60"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.floor(RANGE / 60) }).map((_, i) => (
              <div
                key={i}
                className="h-16 border-b border-dashed border-slate-200"
              />
            ))}
          </div>

          {nowMin >= START && nowMin <= END && (
            <div
              className="absolute left-0 right-0 flex items-center"
              style={{
                top: `calc(${((nowMin - START) / RANGE) * 100}% - 1px)`,
              }}
            >
              <div className="h-0.5 w-full bg-red-400" />
            </div>
          )}

          <div className="relative" style={{ height: HOUR_PX * (RANGE / 60) }}>
            {tasks.map((t) => {
              const s = drag && drag.id === t._id ? drag.startMin : t.startMin;
              const eMin = drag && drag.id === t._id ? drag.endMin : t.endMin;
              const topPct = ((s - START) / RANGE) * 100;
              const hPct = ((eMin - s) / RANGE) * 100;
              return (
                <div
                  key={t._id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Task ${t.title} from ${minutesToLabel(
                    s
                  )} to ${minutesToLabel(eMin)}`}
                  className={`absolute left-2 right-2 rounded-md border ${borderFor(
                    t.priority
                  )} shadow-sm cursor-pointer select-none hover:ring-1 hover:ring-sky-300`}
                  style={{
                    top: `${topPct}%`,
                    height: `${hPct}%`,
                    background: colorFor(t),
                    minHeight: 16,
                  }}
                  onClick={() => {
                    if (justDraggedRef.current) return;
                    setFocus(t);
                  }}
                  onDoubleClick={() => setFocus(t)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setFocus(t);
                    }
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-grab"
                    title="Drag to move"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      beginPointer(e, t, "move");
                    }}
                  />

                  <div
                    className="absolute left-0 right-0 h-2 -top-1 cursor-n-resize"
                    title="Resize start"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      beginPointer(e, t, "resizeTop");
                    }}
                  />
                  <div
                    className="absolute left-0 right-0 h-2 -bottom-1 cursor-s-resize"
                    title="Resize end"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      beginPointer(e, t, "resizeBottom");
                    }}
                  />

                  <div className="p-2 text-sm break-words">
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span className="font-medium text-slate-800">
                        {t.title}
                      </span>
                      <span>
                        {minutesToLabel(s)} - {minutesToLabel(eMin)}
                      </span>
                    </div>
                  </div>
                  {t.done && (
                    <div className="absolute top-1 right-1 text-[10px] bg-white/70 rounded px-1">
                      done
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd && (
        <TaskModal
          title="Add Task"
          initial={{
            title: "",
            startMin: Math.max(START, nowMin),
            endMin: Math.max(START + 30, nowMin + 60),
            category: "work",
            priority: "medium",
          }}
          onClose={() => setShowAdd(false)}
          onSave={async (v) => {
            await createM.mutateAsync({
              title: v.title.trim(),
              description: v.description?.trim() || undefined,
              day: today,
              startMin: v.startMin,
              endMin: v.endMin,
              category: v.category,
              priority: v.priority,
              color: v.color || undefined,
              tags: [],
            });
            setShowAdd(false);
            listQ.refetch();
          }}
        />
      )}

      {focus && (
        <FocusModal
          task={focus}
          nowMin={nowMin}
          onClose={() => setFocus(null)}
          onDone={async () => {
            await toggleM.mutateAsync({ id: focus._id });
            setFocus(null);
            listQ.refetch();
          }}
          onDelete={async () => {
            await removeM.mutateAsync({ id: focus._id });
            setFocus(null);
            listQ.refetch();
          }}
        />
      )}
    </section>
  );
}

function toTimeStr(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fromTimeStr(s: string) {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function TaskModal({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial: {
    title: string;
    startMin: number;
    endMin: number;
    category: TaskDoc["category"];
    priority: TaskDoc["priority"];
    description?: string;
    color?: string;
  };
  onClose: () => void;
  onSave: (v: {
    title: string;
    startMin: number;
    endMin: number;
    category: TaskDoc["category"];
    priority: TaskDoc["priority"];
    description?: string;
    color?: string;
  }) => void | Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b rounded-t-2xl">
          <div className="font-semibold text-slate-800">{title}</div>
          <button className="px-3 py-1.5 rounded-md border" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-600">Task Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
              placeholder="e.g., Standup meeting"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Start</label>
              <input
                type="time"
                value={toTimeStr(form.startMin)}
                onChange={(e) =>
                  setForm({ ...form, startMin: fromTimeStr(e.target.value) })
                }
                className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">End</label>
              <input
                type="time"
                value={toTimeStr(form.endMin)}
                onChange={(e) =>
                  setForm({ ...form, endMin: fromTimeStr(e.target.value) })
                }
                className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as TaskDoc["category"],
                  })
                }
                className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
              >
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="break">Break</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Priority</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as TaskDoc["priority"],
                  })
                }
                className="mt-1 w-full border rounded-md px-2 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600">Notes (optional)</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="mt-1 w-full border rounded-md px-2 py-2 text-sm h-20"
            />
          </div>
        </div>

        <div className="px-4 pb-4 flex justify-end">
          <button
            className="px-3 py-1.5 rounded-md bg-sky-600 text-white"
            onClick={() => onSave(form)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function FocusModal({
  task,
  nowMin,
  onClose,
  onDone,
  onDelete,
}: {
  task: TaskDoc;
  nowMin: number;
  onClose: () => void;
  onDone: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const remaining =
    nowMin < task.startMin
      ? task.startMin - nowMin
      : nowMin <= task.endMin
      ? task.endMin - nowMin
      : 0;
  const remainingLabel =
    remaining > 0 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : "0m";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b rounded-t-2xl">
          <div className="font-semibold text-slate-800">Focus</div>
          <button className="px-3 py-1.5 rounded-md border" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4 space-y-2">
          <div className="text-lg font-semibold">{task.title}</div>
          <div className="text-sm text-gray-600">
            {minutesToLabel(task.startMin)} – {minutesToLabel(task.endMin)}
          </div>
          <div className="text-sm">
            Time left: <span className="font-medium">{remainingLabel}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white"
              onClick={onDone}
            >
              Mark Completed
            </button>
            <button
              className="px-3 py-1.5 rounded-md border"
              onClick={onDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HostHomePage() {
  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-sky-700 mb-4">
        Home
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ConversationsFeed />
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          <NotesStrip />
          <SchedulerToday />
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          article > div.relative.h-80 { height: 46vh; }
        }
      `}</style>
    </div>
  );
}

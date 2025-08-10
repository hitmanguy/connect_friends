"use client";

import { useState } from "react";
import MoodCalendar from "@/app/_components/calendar";
import { trpc } from "../../../../../utils/providers/TrpcProviders";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mood Calendar",
  description: "Track your moods",
};

export default function MoodPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data: myData, isLoading: loadingMy } =
    trpc.mood.getMoodEntries.useQuery({
      startDate,
      endDate,
      timezone: timezone,
      limit: 100,
    });

  const { data: sharedData, isLoading: loadingShared } =
    trpc.mood.getSharedMoods.useQuery({
      startDate,
      endDate,
      timezone: timezone,
      limit: 100,
    });

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-blue-100"
            aria-label="Previous month"
          >
            &lt;
          </button>
          <h1 className="text-2xl font-bold text-sky-700">
            {new Date(year, month).toLocaleString("default", { month: "long" })}{" "}
            {year}
          </h1>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-blue-100"
            aria-label="Next month"
          >
            &gt;
          </button>
        </div>
        {loadingMy || loadingShared ? (
          <div className="text-center text-blue-400">Loading...</div>
        ) : (
          <MoodCalendar
            month={month}
            year={year}
            myEntries={myData?.entries || []}
            receivedEntries={sharedData?.entries || []}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { Metadata } from "next";
import MoodTracker from "../../../_components/moodTracker";

export const metadata: Metadata = {
  title: "Mood Tracker",
  description: "Track your moods and share with friends",
};

export default function MoodPage() {
  return <MoodTracker />;
}

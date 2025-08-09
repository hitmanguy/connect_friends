import { Metadata } from "next";
import UnoGame from "../../../_components/uno";

export const metadata: Metadata = {
  title: "UNO Game - Connect Friends",
  description: "Play professional UNO game with friends and bots",
};

export default function GamePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <UnoGame />
    </main>
  );
}

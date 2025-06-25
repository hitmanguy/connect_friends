import Image from "next/image";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import "@/app/globals.css";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-white p-4">
      <div className="grid grid-cols-4 gap-4">
       {[...Array(4)].map((_, i) => (
          <div 
            key={i}
            className="rounded-full bg-gradient-to-br from-blue-500 to-blue-300 p-2 animate-pendulum"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
          </div>
      ))}
      </div>
     
    </div>
  );
}

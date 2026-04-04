"use client";

import { PlatformDef } from "../lib/types";

interface PlatformSelectorProps {
  platforms: PlatformDef[];
  selected: string | null;
  onSelect: (name: string) => void;
}

export default function PlatformSelector({
  platforms,
  selected,
  onSelect,
}: PlatformSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {platforms.map((platform) => (
        <button
          key={platform.name}
          onClick={() => onSelect(platform.name)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selected === platform.name
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          {platform.name}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface SearchInputProps {
  defaultValue: string;
}

export default function SearchInput({ defaultValue }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="キーワードを入力（例：DX、戦略、PMO）"
        className="w-full h-[48px] pl-12 pr-4 text-[14px] text-navy bg-white border border-border rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/10 placeholder:text-[#bbb] transition-all"
        autoFocus
      />
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#999]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-[36px] px-4 bg-blue text-white text-[13px] font-bold rounded-md hover:bg-blue-dark transition-colors"
      >
        検索
      </button>
    </form>
  );
}

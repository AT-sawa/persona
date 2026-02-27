"use client";

import { useState } from "react";

interface SkillsInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "PMO", "戦略", "DX推進", "業務改善", "BPR",
  "SAP", "新規事業", "M&A", "データ分析", "IT戦略",
  "組織改革", "SCM", "マーケティング", "財務",
  "AWS", "Python", "Salesforce", "ERP",
];

export default function SkillsInput({
  value,
  onChange,
  suggestions = DEFAULT_SUGGESTIONS,
}: SkillsInputProps) {
  const [input, setInput] = useState("");

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }

  function removeSkill(skill: string) {
    onChange(value.filter((s) => s !== skill));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(input);
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeSkill(value[value.length - 1]);
    }
  }

  const availableSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div>
      {/* Selected skills */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
        {value.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue/10 text-blue text-[12px] font-bold"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-blue/60 hover:text-blue ml-0.5 leading-none"
            >
              &times;
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="スキルを入力（Enterで追加）"
        className="w-full px-3 py-2 border border-border text-[13px] text-text outline-none bg-[#fafafa] focus:border-blue focus:bg-white"
      />

      {/* Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {availableSuggestions.slice(0, 10).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSkill(s)}
              className="text-[11px] text-[#888] border border-border/60 px-2 py-0.5 hover:border-blue hover:text-blue transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

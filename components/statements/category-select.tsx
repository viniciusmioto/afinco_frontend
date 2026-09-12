"use client";

import type { Category } from "@/lib/types/transaction";

interface CategorySelectProps {
  categories: Category[];
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (categoryId: string) => void;
}

/** Per-row category override applied before the reviewed batch is saved. */
export function CategorySelect({ categories, label, value, disabled, onChange }: CategorySelectProps) {
  return (
    <select
      aria-label={label}
      className="field h-9 w-full min-w-36 px-2 text-xs disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {categories.length === 0 && <option value="">No category available</option>}
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

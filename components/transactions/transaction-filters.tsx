import { Search, X } from "lucide-react";
import type { Category, TransactionFilters } from "@/lib/types/transaction";

interface TransactionFiltersProps {
  value: TransactionFilters;
  categories: Category[];
  onChange: (filters: TransactionFilters) => void;
}

const emptyFilters: TransactionFilters = { search: "", categoryId: "" };

/** Refines the rows of the selected statement or month without leaving that scope. */
export function TransactionFiltersBar({ value, categories, onChange }: TransactionFiltersProps) {
  const hasFilters = Object.values(value).some(Boolean);
  const setFilter = (field: keyof TransactionFilters, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <section aria-label="Transaction filters" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-panel sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_240px_auto]">
        <label className="relative">
          <span className="sr-only">Search transactions</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <input
            className="field pl-9"
            onChange={(event) => setFilter("search", event.target.value)}
            placeholder="Search description, bank, or category"
            type="search"
            value={value.search}
          />
        </label>

        <label>
          <span className="sr-only">Filter by category</span>
          <select
            className="field"
            onChange={(event) => setFilter("categoryId", event.target.value)}
            value={value.categoryId}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button
            className="focus-ring inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            onClick={() => onChange(emptyFilters)}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
            Clear
          </button>
        )}
      </div>
    </section>
  );
}

import type { Category } from "@/lib/types/transaction";

export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: category.colorCode }} />
      {category.name}
    </span>
  );
}

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpendingTimeline } from "@/components/breakdown/spending-timeline";
import { timeBuckets, typeBreakdowns } from "@/lib/breakdown/breakdown";
import type { Category, Transaction } from "@/lib/types/transaction";
import { transactions } from "@/test/fixtures";

const rent: Category = { id: 3, name: "Rent", expenseType: "FIXED", colorCode: "#4F46E5" };
const phone: Category = { id: 11, name: "Phone & Internet", expenseType: "FIXED", colorCode: "#6366F1" };
const groceries: Category = { id: 1, name: "Groceries", expenseType: "VARIABLE", colorCode: "#2563EB" };
const rows: Transaction[] = [
  { ...transactions[0], id: 1, date: "2026-07-02", amount: 1450, category: rent },
  { ...transactions[0], id: 2, date: "2026-07-02", amount: 40.24, category: phone },
  { ...transactions[0], id: 3, date: "2026-07-03", amount: 88.1, category: groceries },
];
const buckets = timeBuckets("2026-07-01", "2026-07-05", "day");

function renderTimeline() {
  render(
    <SpendingTimeline
      breakdowns={typeBreakdowns(rows, [rent, phone, groceries], buckets)}
      bucketSize="day"
      buckets={buckets}
      noun="month"
      onBucketSizeChange={jest.fn()}
    />,
  );
}

describe("SpendingTimeline", () => {
  it("draws one stacked segment per category with spending on a bar", () => {
    renderTimeline();

    const fixed = screen.getByRole("group", { name: "Fixed spending per day" });
    // Rent and Phone & Internet stack on July 2: one plain segment and one with a rounded top.
    expect(fixed.querySelectorAll("svg rect:not([rx])")).toHaveLength(1);
    expect(fixed.querySelectorAll("svg path")).toHaveLength(1);
  });

  it("reads a day with the keyboard and highlights the same day in every chart", async () => {
    const user = userEvent.setup();
    renderTimeline();
    const fixed = screen.getByRole("group", { name: "Fixed spending per day" });
    const variable = screen.getByRole("group", { name: "Variable spending per day" });

    fixed.focus();
    await user.keyboard("{Home}{ArrowRight}");

    const tooltip = screen.getByTestId("timeline-tooltip-fixed");
    expect(tooltip).toHaveTextContent("Jul 2Rent$1,450.00Phone & Internet$40.24Total$1,490.24");
    expect(fixed.querySelector("svg rect[rx]")).toBeInTheDocument();
    expect(variable.querySelector("svg rect[rx]")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline-tooltip-variable")).not.toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("timeline-tooltip-fixed")).toHaveTextContent("Jul 3No fixed spending");

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("timeline-tooltip-fixed")).not.toBeInTheDocument();
  });

  it("names the month on the first day tick", () => {
    renderTimeline();

    expect(within(screen.getByRole("group", { name: "Variable spending per day" })).getByText("Jul 1")).toBeInTheDocument();
  });
});

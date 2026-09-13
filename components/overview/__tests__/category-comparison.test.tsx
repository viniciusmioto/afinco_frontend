import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryComparison } from "@/components/overview/category-comparison";
import { categoryRows } from "@/lib/overview/spending";
import { monthlySpending } from "@/test/fixtures";

const { categories, periods } = monthlySpending;

describe("CategoryComparison", () => {
  it("ranks categories by their total with a share of spending", () => {
    render(<CategoryComparison groupBy="MONTH" rangeName="May – Aug 2026" rows={categoryRows(categories, periods, null)} selectedName={null} />);

    expect(screen.getByText("May – Aug 2026")).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Groceries, Variable$1,050.0054% of total",
      "Transport, Fixed$400.0021% of total",
      "Occasional, Occasional$200.0010% of total",
      "Subscriptions, Fixed$150.008% of total",
      "Food & Leisure, Variable$150.008% of total",
    ]);
  });

  it("compares a selected period with each category's average", () => {
    render(<CategoryComparison groupBy="MONTH" rangeName="May – Aug 2026" rows={categoryRows(categories, periods, periods[2])} selectedName="July 2026" />);

    expect(screen.getByText("Average per complete month")).toBeInTheDocument();
    const [groceries] = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(groceries).toHaveTextContent("Groceries, Variable$400.00+26% vs avg");
  });

  it("offers the comparison as a table", async () => {
    const user = userEvent.setup();
    render(<CategoryComparison groupBy="MONTH" rangeName="May – Aug 2026" rows={categoryRows(categories, periods, periods[2])} selectedName="July 2026" />);

    await user.click(screen.getByRole("button", { name: "Show table" }));

    const table = screen.getByRole("table", { name: "Spending by category" });
    expect(within(table).getByRole("columnheader", { name: "July 2026" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("GroceriesVariable$400.00$316.67+26% vs avg$1,050.0057%");
  });
});

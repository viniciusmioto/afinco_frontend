import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TransactionFiltersBar } from "@/components/transactions/transaction-filters";
import type { TransactionFilters } from "@/lib/types/transaction";
import { transactions } from "@/test/fixtures";

const initial: TransactionFilters = { search: "", categoryId: "" };

function FilterHarness() {
  const [filters, setFilters] = useState(initial);
  return (
    <>
      <TransactionFiltersBar
        categories={transactions.map((transaction) => transaction.category)}
        onChange={setFilters}
        value={filters}
      />
      <output aria-label="Current filters">{JSON.stringify(filters)}</output>
    </>
  );
}

describe("TransactionFiltersBar", () => {
  it("updates search and category filters without offering a date range", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await user.type(screen.getByRole("searchbox", { name: "Search transactions" }), "market");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by category" }), "2");

    expect(screen.getByLabelText("Current filters")).toHaveTextContent('"search":"market"');
    expect(screen.getByLabelText("Current filters")).toHaveTextContent('"categoryId":"2"');
    expect(screen.queryByLabelText("Start date")).not.toBeInTheDocument();
  });

  it("clears active filters", async () => {
    const user = userEvent.setup();
    render(<FilterHarness />);

    await user.type(screen.getByRole("searchbox", { name: "Search transactions" }), "payroll");
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("searchbox", { name: "Search transactions" })).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });
});

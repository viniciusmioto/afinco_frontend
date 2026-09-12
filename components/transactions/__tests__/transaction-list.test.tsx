import { render, screen, within } from "@testing-library/react";
import { TransactionList } from "@/components/transactions/transaction-list";
import { transactions } from "@/test/fixtures";

describe("TransactionList", () => {
  it("renders responsive cards and a desktop table with transaction details", () => {
    render(<TransactionList transactions={transactions} />);

    const table = screen.getByTestId("transaction-table");
    expect(within(table).getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Statement" })).not.toBeInTheDocument();
    expect(within(table).getByText("Harbour Market")).toBeInTheDocument();
    expect(within(table).getByText("Groceries")).toBeInTheDocument();
    expect(within(table).getByText("CREDIT")).toBeInTheDocument();

    const cards = screen.getByTestId("transaction-cards");
    expect(within(cards).getByText("Monthly payroll")).toBeInTheDocument();
    expect(within(cards).getByText("DEBIT")).toBeInTheDocument();
  });

  it("names the source statement of each row when asked", () => {
    render(<TransactionList showSource transactions={transactions} />);

    const table = screen.getByTestId("transaction-table");
    expect(within(table).getByRole("columnheader", { name: "Statement" })).toBeInTheDocument();
    expect(within(table).getByText("Statement Aug 14 – Sep 13, 2026")).toBeInTheDocument();
    expect(within(table).getByText("Manual entry")).toBeInTheDocument();
  });

  it("renders a helpful empty state", () => {
    render(<TransactionList emptyMessage="Nothing in this month." transactions={[]} />);

    expect(screen.getByRole("heading", { name: "No transactions found" })).toBeInTheDocument();
    expect(screen.getByText("Nothing in this month.")).toBeInTheDocument();
  });
});

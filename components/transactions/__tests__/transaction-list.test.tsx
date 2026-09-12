import { render, screen, within } from "@testing-library/react";
import { TransactionList } from "@/components/transactions/transaction-list";
import { transactions } from "@/test/fixtures";

describe("TransactionList", () => {
  it("renders responsive cards and a desktop table with transaction details", () => {
    render(<TransactionList transactions={transactions} />);

    const table = screen.getByTestId("transaction-table");
    expect(within(table).getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(within(table).getByText("Harbour Market")).toBeInTheDocument();
    expect(within(table).getByText("Groceries")).toBeInTheDocument();
    expect(within(table).getByText("CREDIT")).toBeInTheDocument();

    const cards = screen.getByTestId("transaction-cards");
    expect(within(cards).getByText("Monthly payroll")).toBeInTheDocument();
    expect(within(cards).getByText("DEBIT")).toBeInTheDocument();
  });

  it("renders a helpful empty state", () => {
    render(<TransactionList transactions={[]} />);

    expect(screen.getByRole("heading", { name: "No transactions found" })).toBeInTheDocument();
  });
});

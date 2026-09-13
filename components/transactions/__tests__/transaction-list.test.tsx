import { render, screen, within } from "@testing-library/react";
import { TransactionList } from "@/components/transactions/transaction-list";
import { categories, transactions } from "@/test/fixtures";

describe("TransactionList", () => {
  it("renders responsive cards and a desktop table with the expense type of each row", () => {
    render(<TransactionList label="Credit transactions" transactions={transactions} />);

    const table = screen.getByRole("table", { name: "Credit transactions" });
    expect(within(table).getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Type" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Statement" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Bank" })).not.toBeInTheDocument();
    expect(within(table).getByText("Harbour Market")).toBeInTheDocument();
    expect(within(table).getByText("Groceries")).toBeInTheDocument();
    expect(within(table).getByText("Variable")).toBeInTheDocument();
    expect(within(table).queryByText("CREDIT")).not.toBeInTheDocument();

    const cards = screen.getByTestId("transaction-cards");
    expect(within(cards).getByText("Monthly payroll")).toBeInTheDocument();
    expect(within(cards).getAllByText("Occasional").length).toBeGreaterThan(0);
  });

  it("names the bank and source statement of each row when asked", () => {
    render(<TransactionList label="Debit transactions" showBank showSource transactions={transactions} />);

    const table = screen.getByRole("table", { name: "Debit transactions" });
    expect(within(table).getByRole("columnheader", { name: "Statement" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Bank" })).toBeInTheDocument();
    expect(within(table).getByText("Statement Aug 14 – Sep 13, 2026")).toBeInTheDocument();
    expect(within(table).getByText("Manual entry")).toBeInTheDocument();
  });

  it("shows payments as negative amounts", () => {
    const payment = { ...transactions[0], amount: 500, category: categories.find((category) => category.name === "Payment")! };
    render(<TransactionList label="Credit transactions" transactions={[payment]} />);

    const table = screen.getByRole("table", { name: "Credit transactions" });
    expect(within(table).getByText("-$500.00")).toBeInTheDocument();
    expect(within(table).getAllByText("Payment")).toHaveLength(2);
  });

  it("renders a helpful empty state", () => {
    render(<TransactionList emptyMessage="Nothing in this month." label="Debit transactions" transactions={[]} />);

    expect(screen.getByRole("heading", { name: "No transactions found" })).toBeInTheDocument();
    expect(screen.getByText("Nothing in this month.")).toBeInTheDocument();
  });
});

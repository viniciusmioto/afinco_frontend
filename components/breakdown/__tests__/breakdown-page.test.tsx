import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BreakdownPage } from "@/components/breakdown/breakdown-page";
import { getSpending } from "@/lib/api/analytics";
import { getStatements } from "@/lib/api/statements";
import { getAccounts, getCategories, getTransactionMonths, getTransactions } from "@/lib/api/transactions";
import type { SpendingOverview } from "@/lib/types/analytics";
import type { Category, PageResponse, Transaction } from "@/lib/types/transaction";
import { accounts, months, statements, transactions } from "@/test/fixtures";
import { currentMockSearch, setMockSearch } from "@/test/next-navigation";

jest.mock("next/navigation", () => jest.requireActual("@/test/next-navigation"));
jest.mock("@/lib/api/analytics", () => ({ getSpending: jest.fn() }));
jest.mock("@/lib/api/statements", () => ({ getStatements: jest.fn() }));
jest.mock("@/lib/api/transactions", () => ({
  getAccounts: jest.fn(),
  getCategories: jest.fn(),
  getTransactionMonths: jest.fn(),
  getTransactions: jest.fn(),
}));

const mockedGetTransactions = jest.mocked(getTransactions);
const mockedGetSpending = jest.mocked(getSpending);

const categories: Category[] = [
  { id: 1, name: "Groceries", expenseType: "VARIABLE", colorCode: "#2563EB" },
  { id: 2, name: "Transport", expenseType: "FIXED", colorCode: "#0EA5E9" },
  { id: 3, name: "Rent", expenseType: "FIXED", colorCode: "#4F46E5" },
  { id: 8, name: "Occasional", expenseType: "OCCASIONAL", colorCode: "#EC4899" },
  { id: 9, name: "Payment", expenseType: "PAYMENT", colorCode: "#10B981" },
];
const [groceries, transport, rent, occasional, payment] = categories;

let nextId = 1;
const row = (date: string, amount: number, category: Category, description: string): Transaction => ({
  ...transactions[0],
  id: nextId++,
  date,
  amount,
  category,
  description,
});

/** August 2026: fixed 1,500, variable 300, occasional 200 (total 2,000), plus a payment that must not count. */
const august = [
  row("2026-08-01", 1450, rent, "Monthly rent"),
  row("2026-08-03", 30, transport, "OPUS"),
  row("2026-08-12", 20, transport, "BIXI"),
  row("2026-08-04", 120, groceries, "MAXI"),
  row("2026-08-10", 100, groceries, "PROVIGO"),
  row("2026-08-20", 60, groceries, "ADONIS"),
  row("2026-08-21", 20, groceries, "METRO"),
  row("2026-08-15", 200, occasional, "IKEA"),
  row("2026-08-16", 900, payment, "PAYMENT - THANK YOU"),
];

function pageOf(content: Transaction[]): PageResponse<Transaction> {
  return { content, page: 0, size: 500, totalElements: content.length, totalPages: 1, first: true, last: true };
}

function monthly(periods: [string, boolean, number, number, number][]): SpendingOverview {
  return {
    groupBy: "MONTH",
    bankName: null,
    categories,
    periods: periods.map(([key, complete, fixed, variable, occasionalAmount]) => ({
      key,
      startDate: `${key}-01`,
      endDate: `${key}-28`,
      statement: null,
      complete,
      categories: [
        { categoryId: rent.id, amount: fixed, transactionCount: 1 },
        { categoryId: groceries.id, amount: variable, transactionCount: 1 },
        { categoryId: occasional.id, amount: occasionalAmount, transactionCount: 1 },
      ],
    })),
  };
}

beforeEach(() => {
  setMockSearch("view=month&month=2026-08");
  jest.mocked(getAccounts).mockResolvedValue(accounts);
  jest.mocked(getCategories).mockResolvedValue(categories);
  jest.mocked(getStatements).mockResolvedValue(statements);
  jest.mocked(getTransactionMonths).mockResolvedValue(months);
  mockedGetTransactions.mockResolvedValue(pageOf(august));
  // June and July average 1,000 fixed, 400 variable, 100 occasional (1,500 total).
  mockedGetSpending.mockResolvedValue(monthly([
    ["2026-06", true, 900, 500, 100],
    ["2026-07", true, 1100, 300, 100],
    ["2026-08", true, 1500, 300, 200],
  ]));
});

afterEach(() => jest.clearAllMocks());

async function renderPage() {
  render(<BreakdownPage />);
  return screen.findByRole("region", { name: "Summary" });
}

function stat(label: string) {
  return within(screen.getByRole("region", { name: "Summary" })).getByText(label).closest("div") as HTMLElement;
}

describe("BreakdownPage", () => {
  it("analyzes one month of confirmed transactions against the usual month", async () => {
    await renderPage();

    expect(mockedGetTransactions).toHaveBeenCalledWith(
      { view: "month", month: "2026-08", bank: null }, expect.any(AbortSignal), "CONFIRMED");
    await waitFor(() => expect(mockedGetSpending).toHaveBeenCalledWith("MONTH", null, expect.any(AbortSignal)));
    expect(screen.getByRole("region", { name: "Summary" })).toHaveTextContent("August 2026 · 31 days · 8 transactions");
    expect(await screen.findByText("+33% vs avg month")).toBeInTheDocument();
    expect(stat("Total expense")).toHaveTextContent("$2,000.00$64.52 per day+33% vs avg month");
    expect(stat("Fixed")).toHaveTextContent("$1,500.0075% of spending+50% vs avg month");
    expect(stat("Variable")).toHaveTextContent("$300.0015% of spending−25% vs avg month");
    expect(stat("Occasional")).toHaveTextContent("$200.0010% of spending+100% vs avg month");
    expect(screen.getByRole("img", { name: "Distribution: Fixed 75%, Variable 15%, Occasional 10%" })).toBeInTheDocument();
    expect(screen.getByText(/average of 2 other complete months/)).toBeInTheDocument();
  });

  it("does not compare a partly imported month", async () => {
    mockedGetSpending.mockResolvedValue(monthly([["2026-07", true, 1000, 400, 100], ["2026-08", false, 1500, 300, 200]]));
    await renderPage();

    expect(await screen.findByText(/only partly imported, so it is not compared/)).toBeInTheDocument();
    expect(screen.queryByText(/vs avg month/)).not.toBeInTheDocument();
  });

  it("stacks each type's categories on a shared daily axis and switches to weeks", async () => {
    const user = userEvent.setup();
    await renderPage();

    const fixed = screen.getByTestId("timeline-fixed");
    expect(within(fixed).getByRole("list", { name: "Fixed categories" })).toHaveTextContent("Transport$50.00Rent$1,450.00");
    expect(within(screen.getByTestId("timeline-variable")).getByRole("list")).toHaveTextContent("Groceries$300.00");
    expect(within(fixed).getByRole("group", { name: "Fixed spending per day" })).toBeInTheDocument();
    expect(screen.queryByText(/Payment/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Weeks" }));

    expect(within(fixed).getByRole("group", { name: "Fixed spending per week" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show table" }));
    const weeks = within(fixed).getByRole("table", { name: "Fixed spending per week" });
    expect(within(weeks).getAllByRole("row").map((tableRow) => tableRow.textContent)).toEqual([
      "WeekTransportRentTotal",
      "Aug 1 – 7$30.00$1,450.00$1,480.00",
      "Aug 8 – 14$20.00—$20.00",
    ]);
  });

  it("lists the three largest expenses of each type", async () => {
    await renderPage();

    const variable = screen.getByRole("table", { name: "Largest variable expenses" });
    expect(within(variable).getAllByRole("row").slice(1).map((tableRow) => tableRow.textContent)).toEqual([
      "1Aug 4MAXIGroceries$120.0040% of variable",
      "2Aug 10PROVIGOGroceries$100.0033% of variable",
      "3Aug 20ADONISGroceries$60.0020% of variable",
    ]);
    expect(within(screen.getByRole("table", { name: "Largest fixed expenses" })).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByRole("table", { name: "Largest occasional expenses" })).toHaveTextContent("IKEA");
  });

  it("explains a type without spending", async () => {
    mockedGetTransactions.mockResolvedValue(pageOf(august.filter((expense) => expense.category !== occasional)));
    await renderPage();

    expect(within(screen.getByTestId("timeline-occasional")).getByText("No occasional spending in this month.")).toBeInTheDocument();
    expect(screen.getAllByText("No occasional spending in this month.")).toHaveLength(2);
  });

  it("analyzes a statement, compared with the bank's other statements", async () => {
    setMockSearch("view=statement&statement=12");
    mockedGetTransactions.mockResolvedValue(pageOf([row("2026-08-20", 42, groceries, "MAXI")]));
    await renderPage();

    expect(mockedGetTransactions).toHaveBeenCalledWith({ view: "statement", statementId: 12 }, expect.any(AbortSignal), "CONFIRMED");
    await waitFor(() => expect(mockedGetSpending).toHaveBeenCalledWith("STATEMENT", "TD Bank", expect.any(AbortSignal)));
    expect(screen.getByRole("region", { name: "Summary" })).toHaveTextContent("Aug 14 – Sep 13, 2026 · 31 days · 1 transaction");
    expect(screen.getByRole("link", { name: "View transactions" })).toHaveAttribute("href", "/transactions?view=statement&statement=12");
  });

  it("changes the period for the whole page", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "2026-07");

    expect(currentMockSearch()).toBe("view=month&month=2026-07");
    await waitFor(() => expect(mockedGetTransactions).toHaveBeenLastCalledWith(
      { view: "month", month: "2026-07", bank: null }, expect.any(AbortSignal), "CONFIRMED"));
  });

  it("explains an empty workspace", async () => {
    setMockSearch("");
    jest.mocked(getStatements).mockResolvedValue([]);
    jest.mocked(getTransactionMonths).mockResolvedValue([]);
    render(<BreakdownPage />);

    expect(await screen.findByRole("heading", { name: "Nothing to break down yet" })).toBeInTheDocument();
    expect(mockedGetTransactions).not.toHaveBeenCalled();
  });
});

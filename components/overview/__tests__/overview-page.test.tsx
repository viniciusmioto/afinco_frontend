import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverviewPage } from "@/components/overview/overview-page";
import { getSpending } from "@/lib/api/analytics";
import { getStatements } from "@/lib/api/statements";
import { getAccounts } from "@/lib/api/transactions";
import { accounts, monthlySpending, statementSpending, statements } from "@/test/fixtures";
import { currentMockSearch, setMockSearch } from "@/test/next-navigation";

jest.mock("next/navigation", () => jest.requireActual("@/test/next-navigation"));
jest.mock("@/lib/api/analytics", () => ({ getSpending: jest.fn() }));
jest.mock("@/lib/api/statements", () => ({ getStatements: jest.fn() }));
jest.mock("@/lib/api/transactions", () => ({ getAccounts: jest.fn() }));

const mockedGetSpending = jest.mocked(getSpending);
const rbc = { id: 8, bankName: "RBC", accountNumberLast4: "7310", currency: "CAD" };

beforeEach(() => {
  setMockSearch("");
  jest.mocked(getAccounts).mockResolvedValue([...accounts, rbc]);
  jest.mocked(getStatements).mockResolvedValue(statements);
  mockedGetSpending.mockImplementation(async (groupBy) => (groupBy === "STATEMENT" ? statementSpending : monthlySpending));
});

afterEach(() => jest.clearAllMocks());

function tile(label: string) {
  return within(screen.getByRole("region", { name: "Key figures" })).getByText(label).parentElement as HTMLElement;
}

describe("OverviewPage", () => {
  it("summarizes monthly spending across every bank by default", async () => {
    render(<OverviewPage />);

    expect(await screen.findByRole("region", { name: "Key figures" })).toBeInTheDocument();
    expect(mockedGetSpending).toHaveBeenCalledWith("MONTH", null, expect.any(AbortSignal));
    expect(currentMockSearch()).toBe("group=month&range=12");
    expect(screen.getByRole("combobox", { name: "Bank" })).toHaveValue("");
    expect(screen.getByTestId("overview-scope-note")).toHaveTextContent("Months combine spending from all banks.");

    expect(tile("Total spent")).toHaveTextContent("$1,950.004 months · May – Aug 2026");
    expect(tile("Average per month")).toHaveTextContent("$600.003 complete months · 1 partial left out");
    expect(tile("Last complete month")).toHaveTextContent("$700.00July 202627% above the average");
    expect(tile("Spending mix")).toHaveTextContent("28% fixed");
    expect(screen.getByRole("heading", { name: "Spending by type" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spending by category" })).toBeInTheDocument();
  });

  it("groups by statement for one bank, choosing the newest statement's bank", async () => {
    const user = userEvent.setup();
    render(<OverviewPage />);
    await screen.findByRole("region", { name: "Key figures" });

    await user.click(screen.getByRole("button", { name: "Statements" }));

    await waitFor(() => expect(mockedGetSpending).toHaveBeenLastCalledWith("STATEMENT", "TD Bank", expect.any(AbortSignal)));
    expect(currentMockSearch()).toBe("group=statement&bank=TD+Bank&range=12");
    const bank = screen.getByRole("combobox", { name: "Bank" });
    expect(bank).toHaveValue("TD Bank");
    expect(within(bank).queryByRole("option", { name: "All banks" })).not.toBeInTheDocument();
    expect(screen.getByTestId("overview-scope-note")).toHaveTextContent("Statements belong to one bank");
    expect(await screen.findByText("Average per statement")).toBeInTheDocument();
  });

  it("narrows months to one bank", async () => {
    const user = userEvent.setup();
    render(<OverviewPage />);
    await screen.findByRole("region", { name: "Key figures" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Bank" }), "RBC");

    await waitFor(() => expect(mockedGetSpending).toHaveBeenLastCalledWith("MONTH", "RBC", expect.any(AbortSignal)));
    expect(currentMockSearch()).toBe("group=month&bank=RBC&range=12");
    expect(screen.getByTestId("overview-scope-note")).toHaveTextContent("Showing RBC only.");
  });

  it("limits every figure to the chosen range without refetching", async () => {
    const user = userEvent.setup();
    render(<OverviewPage />);
    await screen.findByRole("region", { name: "Key figures" });

    await user.click(screen.getByRole("button", { name: "Last 3 months" }));

    expect(currentMockSearch()).toBe("group=month&range=3");
    expect(tile("Total spent")).toHaveTextContent("$1,450.003 months · Jun – Aug 2026");
    expect(mockedGetSpending).toHaveBeenCalledTimes(1);
  });

  it("compares a selected period from the URL", async () => {
    setMockSearch("group=month&range=12&period=2026-06");
    render(<OverviewPage />);

    expect(await screen.findByText("Selected month")).toBeInTheDocument();
    expect(tile("Selected month")).toHaveTextContent("$600.00June 2026In line with the average");
    expect(screen.getByText("Average per complete month")).toBeInTheDocument();
  });

  it("explains that statements must be imported before grouping by them", async () => {
    const user = userEvent.setup();
    jest.mocked(getStatements).mockResolvedValue([]);
    setMockSearch("group=statement");
    render(<OverviewPage />);

    expect(await screen.findByRole("heading", { name: "No imported statements yet" })).toBeInTheDocument();
    expect(mockedGetSpending).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "View by month" }));
    await waitFor(() => expect(mockedGetSpending).toHaveBeenCalledWith("MONTH", null, expect.any(AbortSignal)));
  });

  it("explains an empty workspace", async () => {
    mockedGetSpending.mockResolvedValue({ ...monthlySpending, periods: [] });
    render(<OverviewPage />);

    expect(await screen.findByRole("heading", { name: "No spending to analyze yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import statements" })).toHaveAttribute("href", "/upload");
  });

  it("retries after a failed load", async () => {
    const user = userEvent.setup();
    mockedGetSpending.mockRejectedValueOnce(new Error("The Afinco API is unavailable"));
    render(<OverviewPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("The Afinco API is unavailable");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("region", { name: "Key figures" })).toBeInTheDocument();
  });
});

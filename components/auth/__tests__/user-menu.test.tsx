import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "@/components/auth/user-menu";
import { logout } from "@/lib/api/auth";
import { getTransactionDataSummary } from "@/lib/api/transaction-data";

jest.mock("@/components/auth/auth-gate", () => ({
  useAuthenticatedUser: () => ({ id: 1, email: "test@test.com" }),
}));
jest.mock("@/lib/api/auth", () => ({ logout: jest.fn() }));
jest.mock("@/lib/api/transaction-data", () => ({
  deleteAllTransactionData: jest.fn(),
  getTransactionDataSummary: jest.fn(),
}));

const mockedLogout = jest.mocked(logout);

beforeEach(() => {
  jest.mocked(getTransactionDataSummary).mockResolvedValue({ transactionCount: 3, statementCount: 1 });
});

afterEach(() => jest.clearAllMocks());

describe("UserMenu", () => {
  it("opens an account menu with the delete action and sign out", async () => {
    const user = userEvent.setup();
    render(<UserMenu />);
    const trigger = screen.getByRole("button", { name: "Account menu" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["Delete all transaction data", "Sign out"]);
    expect(items[0]).toHaveFocus();
  });

  it("moves between items with the arrow keys and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(screen.getByRole("button", { name: "Account menu" }));

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete all transaction data" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveFocus();
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    render(<><UserMenu /><p>Outside</p></>);
    await user.click(screen.getByRole("button", { name: "Account menu" }));

    await user.click(screen.getByText("Outside"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the delete confirmation from the menu instead of deleting immediately", async () => {
    const user = userEvent.setup();
    render(<UserMenu compact />);
    await user.click(screen.getByRole("button", { name: "Account menu" }));

    await user.click(screen.getByRole("menuitem", { name: "Delete all transaction data" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("alertdialog", { name: "Are you sure you want to delete all transaction data?" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/3 transactions and 1 imported statement\./)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("reports a failed sign out", async () => {
    const user = userEvent.setup();
    mockedLogout.mockRejectedValue(new Error("offline"));
    render(<UserMenu />);
    await user.click(screen.getByRole("button", { name: "Account menu" }));

    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign out failed");
  });
});

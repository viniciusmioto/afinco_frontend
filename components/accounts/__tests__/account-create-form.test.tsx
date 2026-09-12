import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountCreateForm } from "@/components/accounts/account-create-form";
import { ApiError } from "@/lib/api/client";
import { createAccount } from "@/lib/api/transactions";
import { accounts } from "@/test/fixtures";

jest.mock("@/lib/api/transactions", () => ({ createAccount: jest.fn() }));

const mockedCreateAccount = jest.mocked(createAccount);

afterEach(() => jest.clearAllMocks());

describe("AccountCreateForm", () => {
  it("keeps the submit button disabled until the last four digits are complete", async () => {
    const user = userEvent.setup();
    render(<AccountCreateForm defaultBankName="TD Bank" onCreated={jest.fn()} />);

    const submit = screen.getByRole("button", { name: "Create account" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Last 4 digits"), "12ab3");
    expect(screen.getByLabelText("Last 4 digits")).toHaveValue("123");
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Last 4 digits"), "4");
    expect(submit).toBeEnabled();
  });

  it("creates the account with a normalized payload and reports it", async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn();
    mockedCreateAccount.mockResolvedValue(accounts[0]);
    render(<AccountCreateForm defaultBankName="  TD Bank " onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Last 4 digits"), "2048");
    await user.clear(screen.getByLabelText("Currency"));
    await user.type(screen.getByLabelText("Currency"), "cad");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(mockedCreateAccount).toHaveBeenCalledWith({ bankName: "TD Bank", accountNumberLast4: "2048", currency: "CAD" });
    expect(onCreated).toHaveBeenCalledWith(accounts[0]);
  });

  it("shows field validation messages returned by the API", async () => {
    const user = userEvent.setup();
    const onCreated = jest.fn();
    mockedCreateAccount.mockRejectedValue(
      new ApiError("Request validation failed", 400, { currency: "must be a three-letter ISO code" }),
    );
    render(<AccountCreateForm defaultBankName="TD Bank" onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Last 4 digits"), "2048");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("must be a three-letter ISO code");
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManualEntryModal } from "@/components/transactions/manual-entry-modal";
import { transactions } from "@/test/fixtures";

const accounts = [transactions[0].account];
const categories = transactions.map((transaction) => transaction.category);

describe("ManualEntryModal", () => {
  it("does not render while closed", () => {
    render(
      <ManualEntryModal accounts={accounts} categories={categories} onClose={jest.fn()} onSubmit={jest.fn()} open={false} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the accessible close button", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <ManualEntryModal accounts={accounts} categories={categories} onClose={onClose} onSubmit={jest.fn()} open />,
    );

    await user.click(screen.getByRole("button", { name: "Close manual entry" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses Occasional as the safe default category", () => {
    render(
      <ManualEntryModal accounts={accounts} categories={categories} onClose={jest.fn()} onSubmit={jest.fn()} open />,
    );

    expect(screen.getByLabelText("Category")).toHaveValue("9");
  });

  it("submits a valid manual credit entry", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <ManualEntryModal accounts={accounts} categories={categories} onClose={jest.fn()} onSubmit={onSubmit} open />,
    );

    await user.type(screen.getByLabelText("Description"), "Coffee subscription");
    await user.clear(screen.getByLabelText("Amount (CAD)"));
    await user.type(screen.getByLabelText("Amount (CAD)"), "18.75");
    await user.selectOptions(screen.getByLabelText("Category"), "2");
    await user.click(screen.getByRole("radio", { name: "Credit" }));
    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 4,
      categoryId: 2,
      amount: 18.75,
      type: "CREDIT",
      description: "Coffee subscription",
    })));
  });
});

import { ofType, paymentTotal, spentTotal } from "@/lib/transactions/summary";
import { categories, transactions } from "@/test/fixtures";

const payment = categories.find((category) => category.name === "Payment")!;

describe("transaction summary", () => {
  const rows = [
    { ...transactions[0], amount: 0.1 },
    { ...transactions[0], id: 3, amount: 0.2 },
    { ...transactions[0], id: 4, amount: 500, category: payment },
    transactions[1],
  ];

  it("adds spending in cents and leaves payments out", () => {
    expect(spentTotal(rows)).toBe(2500.3);
    expect(paymentTotal(rows)).toBe(500);
  });

  it("splits credit and debit rows", () => {
    expect(ofType(rows, "CREDIT")).toHaveLength(3);
    expect(ofType(rows, "DEBIT")).toEqual([transactions[1]]);
  });
});

import type { Account } from "@/lib/types/transaction";

/** Unique bank names, alphabetical. Several accounts (a card and a checking account) can share a bank. */
export function distinctBanks(accounts: Pick<Account, "bankName">[]): string[] {
  return [...new Set(accounts.map((account) => account.bankName))].sort((left, right) => left.localeCompare(right));
}

/** Reads a bank filter from the URL. Blank means every bank. */
export function readBankParam(value: string | null): string | null {
  const bank = value?.trim();
  return bank ? bank.slice(0, 100) : null;
}

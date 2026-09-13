import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "@/components/layout/mobile-nav";

jest.mock("@/components/auth/user-menu", () => ({ UserMenu: () => <button type="button">Account menu</button> }));

describe("MobileNav", () => {
  it("keeps the header pinned and names the current page", () => {
    render(<MobileNav current="Overview" />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("sticky", "top-0");
    expect(header).toHaveTextContent("Afinco / Overview");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the navigation from the menu button and closes it on Escape", async () => {
    const user = userEvent.setup();
    render(<MobileNav current="Transactions" />);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });

    await user.click(trigger);

    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(drawer).getByRole("button", { name: "Close navigation menu" })).toHaveFocus();
    expect(within(drawer).getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/overview");
    expect(within(drawer).getByRole("link", { name: "Breakdown" })).toHaveAttribute("href", "/breakdown");
    expect(within(drawer).getByRole("link", { name: "Transactions" })).toHaveAttribute("aria-current", "page");
    expect(within(drawer).getByText("Accounts").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes after choosing a page", async () => {
    const user = userEvent.setup();
    render(<MobileNav current="Overview" />);

    // jsdom cannot navigate; the drawer only needs to see the click.
    const preventNavigation = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("click", preventNavigation);

    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Import" }));
    document.removeEventListener("click", preventNavigation);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

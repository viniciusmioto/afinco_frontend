import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpendingTrendChart } from "@/components/overview/spending-trend-chart";
import { periodTotals } from "@/lib/overview/spending";
import { monthlySpending } from "@/test/fixtures";

const totals = periodTotals(monthlySpending);

function renderChart(selectedKey: string | null = null) {
  const onSelect = jest.fn();
  render(<SpendingTrendChart groupBy="MONTH" onSelect={onSelect} selectedKey={selectedKey} totals={totals} />);
  return { onSelect, plot: screen.getByRole("group", { name: "Spending by type" }) };
}

describe("SpendingTrendChart", () => {
  it("reads out the latest period per type and flags partial periods", () => {
    renderChart();

    const series = screen.getByRole("group", { name: "Series" });
    expect(within(series).getByRole("button", { name: /Fixed\s*\$50\.00/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("trend-readout")).toHaveTextContent("August 2026 · $150.00 total · partial period");
    expect(screen.getByText(/Partial month: not fully imported yet/)).toBeInTheDocument();
  });

  it("draws one line per visible type and lets a series be hidden, but never the last one", async () => {
    const user = userEvent.setup();
    const { plot } = renderChart();
    expect(plot.querySelectorAll("polyline")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /Variable/ }));
    await user.click(screen.getByRole("button", { name: /Occasional/ }));

    expect(plot.querySelectorAll("polyline")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Fixed/ })).toBeDisabled();
  });

  it("moves through periods with the keyboard, showing a tooltip, and selects with Enter", async () => {
    const user = userEvent.setup();
    const { onSelect, plot } = renderChart();

    plot.focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByTestId("trend-tooltip")).toHaveTextContent("July 2026");
    expect(screen.getByTestId("trend-tooltip")).toHaveTextContent("Total$700.00");
    expect(screen.getByTestId("trend-readout")).toHaveTextContent("July 2026");

    await user.keyboard("{Home}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("2026-05");
  });

  it("clears a selection from the chip or by choosing the same period again", async () => {
    const user = userEvent.setup();
    const { onSelect, plot } = renderChart("2026-06");

    expect(screen.getByTestId("trend-readout")).toHaveTextContent("June 2026");
    await user.click(screen.getByRole("button", { name: "Clear the selected period" }));
    expect(onSelect).toHaveBeenLastCalledWith(null);

    plot.focus();
    await user.keyboard("{ArrowRight}{ArrowLeft}{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("selects the period under the pointer", () => {
    const { onSelect, plot } = renderChart();
    const svg = plot.querySelector("svg")!;

    // jsdom has no layout: the plot measures 640px wide from its left edge at 0.
    fireEvent.click(svg, { clientX: 62 });
    expect(onSelect).toHaveBeenCalledWith("2026-05");
  });

  it("offers the same figures as a table", async () => {
    const user = userEvent.setup();
    renderChart();

    await user.click(screen.getByRole("button", { name: "Show table" }));

    const table = screen.getByRole("table", { name: "Spending by type per month" });
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("August 2026partial$50.00$100.00$0.00$150.00");
    expect(rows[4]).toHaveTextContent("May 2026$150.00$300.00$50.00$500.00");
  });
});

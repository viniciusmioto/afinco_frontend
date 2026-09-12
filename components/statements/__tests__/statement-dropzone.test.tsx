import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatementDropzone } from "@/components/statements/statement-dropzone";
import { pdfFile } from "@/test/fixtures";

function renderDropzone(overrides: Partial<Parameters<typeof StatementDropzone>[0]> = {}) {
  const props = {
    statementType: "CREDIT_CARD" as const,
    onStatementTypeChange: jest.fn(),
    onFilesSelected: jest.fn(),
    ...overrides,
  };
  render(<StatementDropzone {...props} />);
  return props;
}

describe("StatementDropzone", () => {
  it("hands every dropped file to the queue", () => {
    const props = renderDropzone();
    const files = [pdfFile("july.pdf"), pdfFile("august.pdf")];

    fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files } });

    expect(props.onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("ignores a drop without files", () => {
    const props = renderDropzone();

    fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files: [] } });

    expect(props.onFilesSelected).not.toHaveBeenCalled();
  });

  it("accepts several PDFs chosen through the file input", async () => {
    const user = userEvent.setup();
    const props = renderDropzone();
    const files = [pdfFile("july.pdf"), pdfFile("august.pdf")];
    const input = screen.getByLabelText(/drag pdfs here/i);

    expect(input).toHaveAttribute("multiple");
    await user.upload(input, files);

    expect(props.onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("highlights the zone while files are dragged over it", () => {
    renderDropzone();
    const zone = screen.getByTestId("statement-dropzone");

    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute("data-dragging", "true");

    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute("data-dragging", "false");
  });

  it("switches the statement type", async () => {
    const user = userEvent.setup();
    const props = renderDropzone();

    await user.click(screen.getByRole("radio", { name: /checking account/i }));

    expect(props.onStatementTypeChange).toHaveBeenCalledWith("CHECKING_ACCOUNT");
  });

  it("uses a compact heading once statements are queued", () => {
    renderDropzone({ compact: true });

    expect(screen.getByRole("heading", { name: "Add more statements" })).toBeInTheDocument();
  });
});

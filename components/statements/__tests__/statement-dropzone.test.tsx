import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatementDropzone } from "@/components/statements/statement-dropzone";
import { pdfFile } from "@/test/fixtures";

function renderDropzone(overrides: Partial<Parameters<typeof StatementDropzone>[0]> = {}) {
  const props = {
    statementType: "CREDIT_CARD" as const,
    file: null,
    uploading: false,
    error: null,
    onStatementTypeChange: jest.fn(),
    onFileChange: jest.fn(),
    onInvalidFile: jest.fn(),
    onUpload: jest.fn(),
    ...overrides,
  };
  render(<StatementDropzone {...props} />);
  return props;
}

describe("StatementDropzone", () => {
  it("accepts a dropped PDF", () => {
    const props = renderDropzone();
    const file = pdfFile();

    fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files: [file] } });

    expect(props.onFileChange).toHaveBeenCalledWith(file);
    expect(props.onInvalidFile).not.toHaveBeenCalled();
  });

  it("rejects a dropped non-PDF and clears any selection", () => {
    const props = renderDropzone();
    const file = new File(["a,b"], "statement.csv", { type: "text/csv" });

    fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files: [file] } });

    expect(props.onInvalidFile).toHaveBeenCalledWith("Only PDF statements can be uploaded.");
    expect(props.onFileChange).toHaveBeenCalledWith(null);
  });

  it("highlights the zone while a file is dragged over it", () => {
    renderDropzone();
    const zone = screen.getByTestId("statement-dropzone");

    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute("data-dragging", "true");

    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute("data-dragging", "false");
  });

  it("ignores a drop while an upload is in flight", () => {
    const props = renderDropzone({ uploading: true });

    fireEvent.drop(screen.getByTestId("statement-dropzone"), { dataTransfer: { files: [pdfFile()] } });

    expect(props.onFileChange).not.toHaveBeenCalled();
  });

  it("accepts a PDF chosen through the file input", async () => {
    const user = userEvent.setup();
    const props = renderDropzone();
    const file = pdfFile();

    await user.upload(screen.getByLabelText(/drag a pdf here/i), file);

    expect(props.onFileChange).toHaveBeenCalledWith(file);
  });

  it("keeps the upload action disabled until a file is attached", async () => {
    const user = userEvent.setup();
    const props = renderDropzone();

    const action = screen.getByRole("button", { name: "Review transactions" });
    expect(action).toBeDisabled();

    await user.click(action);
    expect(props.onUpload).not.toHaveBeenCalled();
  });

  it("uploads the attached file when the action is pressed", async () => {
    const user = userEvent.setup();
    const props = renderDropzone({ file: pdfFile("september.pdf") });

    expect(screen.getByTestId("selected-file")).toHaveTextContent("september.pdf");
    await user.click(screen.getByRole("button", { name: "Review transactions" }));

    expect(props.onUpload).toHaveBeenCalledTimes(1);
  });

  it("clears the attached file", async () => {
    const user = userEvent.setup();
    const props = renderDropzone({ file: pdfFile("september.pdf") });

    await user.click(screen.getByRole("button", { name: "Remove september.pdf" }));

    expect(props.onFileChange).toHaveBeenCalledWith(null);
  });

  it("switches the statement type", async () => {
    const user = userEvent.setup();
    const props = renderDropzone();

    await user.click(screen.getByRole("radio", { name: /checking account/i }));

    expect(props.onStatementTypeChange).toHaveBeenCalledWith("CHECKING_ACCOUNT");
  });

  it("shows a parsing state while uploading", () => {
    renderDropzone({ file: pdfFile(), uploading: true });

    expect(screen.getByRole("button", { name: /parsing statement/i })).toBeDisabled();
  });

  it("renders an upload error", () => {
    renderDropzone({ error: "That PDF is larger than the 10 MiB limit." });

    expect(screen.getByRole("alert")).toHaveTextContent("larger than the 10 MiB limit");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate, useAuthenticatedUser } from "@/components/auth/auth-gate";
import { getSession } from "@/lib/api/auth";

jest.mock("@/lib/api/auth", () => ({ getSession: jest.fn() }));

const mockedGetSession = jest.mocked(getSession);
const replace = jest.fn();
const originalLocation = window.location;

function SignedInEmail() {
  return <p>{useAuthenticatedUser().email}</p>;
}

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, pathname: "/upload", search: "?step=1", replace },
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

afterEach(() => jest.clearAllMocks());

describe("AuthGate", () => {
  it("renders protected content for a signed-in user", async () => {
    mockedGetSession.mockResolvedValue({ authenticated: true, user: { id: 1, email: "test@test.com" } });

    render(<AuthGate><SignedInEmail /></AuthGate>);

    expect(await screen.findByText("test@test.com")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects an anonymous session to login and preserves the return path", async () => {
    mockedGetSession.mockResolvedValue({ authenticated: false, user: null });

    render(<AuthGate><SignedInEmail /></AuthGate>);

    await screen.findByLabelText("Verifying your session");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replace).toHaveBeenCalledWith("/login?returnTo=%2Fupload%3Fstep%3D1");
    expect(screen.queryByText("test@test.com")).not.toBeInTheDocument();
  });

  it("offers a retry when the API is unavailable", async () => {
    const user = userEvent.setup();
    mockedGetSession
      .mockRejectedValueOnce(new Error("The Afinco API is unavailable"))
      .mockResolvedValueOnce({ authenticated: true, user: { id: 1, email: "test@test.com" } });

    render(<AuthGate><SignedInEmail /></AuthGate>);

    expect(await screen.findByRole("alert")).toHaveTextContent("The Afinco API is unavailable");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("test@test.com")).toBeInTheDocument();
  });
});

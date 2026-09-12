import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/login-form";
import { login } from "@/lib/api/auth";

jest.mock("@/lib/api/auth", () => ({ login: jest.fn() }));

const mockedLogin = jest.mocked(login);

afterEach(() => jest.clearAllMocks());

describe("LoginForm", () => {
  it("submits the email and password without altering them", async () => {
    const user = userEvent.setup();
    mockedLogin.mockReturnValue(new Promise(() => {}));
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "test@test.com");
    await user.type(screen.getByLabelText("Password"), "123@Test");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mockedLogin).toHaveBeenCalledWith({ email: "test@test.com", password: "123@Test" });
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  it("shows a generic API authentication error and allows another attempt", async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(new Error("Invalid email or password"));
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "nobody@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("toggles password visibility without changing its value", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");

    await user.type(password, "123@Test");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("123@Test");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });
});

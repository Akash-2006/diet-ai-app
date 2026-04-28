import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SetupPage from "@/app/setup/page";
import { ENCRYPTED_API_KEY_STORAGE_KEY } from "@/lib/encryptedApiKey";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("SetupPage", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ENCRYPTION_SECRET", "test-shared-secret-for-vitest-only!!");
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("shows validation when saving with an empty API key", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);
    await user.click(screen.getByRole("button", { name: /encrypt & save/i }));
    expect(screen.getByText(/Enter your Anthropic API key/i)).toBeInTheDocument();
  });

  it("writes encrypted ciphertext to localStorage after save", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);
    await user.type(screen.getByLabelText(/Anthropic API key/i), "sk-ant-test-example-key-not-real");
    await user.click(screen.getByRole("button", { name: /encrypt & save/i }));
    await waitFor(() =>
      expect((localStorage.getItem(ENCRYPTED_API_KEY_STORAGE_KEY) ?? "").length).toBeGreaterThan(30)
    );
  });
});

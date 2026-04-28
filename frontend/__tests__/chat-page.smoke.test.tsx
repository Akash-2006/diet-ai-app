import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ChatPage from "@/app/chat/page";
import { ENCRYPTED_API_KEY_STORAGE_KEY } from "@/lib/encryptedApiKey";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ChatPage smoke", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_PASSWORD", "test-app-password");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000");
    localStorage.clear();
    localStorage.setItem(ENCRYPTED_API_KEY_STORAGE_KEY, "test-stored-ciphertext");
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("shows heading, message field, Photo, and Send when an API key is stored", async () => {
    render(<ChatPage />);

    expect(await screen.findByRole("heading", { name: /^chat$/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^photo$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^send$/i })).toBeInTheDocument();
  });

  it("file input stays wired behind the Photo button", async () => {
    const user = userEvent.setup();
    render(<ChatPage />);

    await screen.findByRole("heading", { name: /^chat$/i });

    await user.click(screen.getByRole("button", { name: /^photo$/i }));
    const filePicker = screen.getByLabelText("Choose food photo");
    expect(filePicker).toBeInTheDocument();
    expect(filePicker).toHaveAttribute("accept", "image/*");
  });
});

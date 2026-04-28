import "@testing-library/jest-dom/vitest";

import React from "react";

import { vi } from "vitest";

vi.mock("next/link", () => ({
  default: function MockLink(
    props: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>
  ) {
    const { href, children, ...rest } = props;
    return React.createElement("a", { href, ...rest }, children);
  },
}));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

(globalThis as unknown as { ResizeObserver?: typeof ResizeObserverStub }).ResizeObserver =
  ResizeObserverStub;

Element.prototype.scrollIntoView = vi.fn();

import { afterEach, beforeEach, describe, expect, it, setSystemTime } from "bun:test";

import { fmtDate, fmtLongDate, relativeTime } from "./format";

describe("fmtDate", () => {
  it("formats ISO date with dots, locale-independent", () => {
    expect(fmtDate("2024-02-07")).toBe("2024.02.07");
    expect(fmtDate("2024-02-07T10:30:00Z")).toBe("2024.02.07");
  });
});

describe("fmtLongDate", () => {
  it("formats long English date", () => {
    expect(fmtLongDate("2024-02-07")).toBe("February 7, 2024");
  });
});

describe("relativeTime", () => {
  beforeEach(() => {
    setSystemTime(new Date("2026-05-06T12:00:00Z"));
  });
  afterEach(() => {
    setSystemTime();
  });

  it("returns empty string when input is undefined", () => {
    expect(relativeTime(undefined)).toBe("");
  });

  it("returns 'just now' for sub-minute differences", () => {
    expect(relativeTime("2026-05-06T11:59:50Z")).toBe("just now");
  });

  it("returns minute granularity under an hour", () => {
    expect(relativeTime("2026-05-06T11:55:00Z")).toBe("5m ago");
  });

  it("returns hour granularity under a day", () => {
    expect(relativeTime("2026-05-06T09:00:00Z")).toBe("3h ago");
  });

  it("returns day granularity beyond 24 hours", () => {
    expect(relativeTime("2026-05-04T12:00:00Z")).toBe("2d ago");
  });
});

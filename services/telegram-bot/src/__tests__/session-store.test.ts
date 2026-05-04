import { describe, it, expect, beforeEach } from "vitest";
import { SessionStore } from "../session-store.js";

describe("SessionStore", () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  describe("get", () => {
    it("returns empty object for unknown user", () => {
      const session = store.get(12345);
      expect(session).toEqual({});
    });

    it("returns existing session after patch", () => {
      store.patch(1, { selectedInstrumentId: "gold" });
      const session = store.get(1);
      expect(session.selectedInstrumentId).toBe("gold");
    });
  });

  describe("patch", () => {
    it("creates session if not exists", () => {
      store.patch(1, { ticker: "AAPL" });
      expect(store.get(1).ticker).toBe("AAPL");
    });

    it("merges with existing session", () => {
      store.patch(1, { selectedInstrumentId: "oil" });
      store.patch(1, { ticker: "BRN" });
      const session = store.get(1);
      expect(session.selectedInstrumentId).toBe("oil");
      expect(session.ticker).toBe("BRN");
    });

    it("overwrites existing fields", () => {
      store.patch(1, { ticker: "OLD" });
      store.patch(1, { ticker: "NEW" });
      expect(store.get(1).ticker).toBe("NEW");
    });
  });

  describe("clear", () => {
    it("removes session for user", () => {
      store.patch(1, { ticker: "AAPL" });
      store.clear(1);
      expect(store.get(1)).toEqual({});
    });

    it("does not throw for unknown user", () => {
      expect(() => store.clear(999)).not.toThrow();
    });

    it("does not affect other users", () => {
      store.patch(1, { ticker: "A" });
      store.patch(2, { ticker: "B" });
      store.clear(1);
      expect(store.get(1)).toEqual({});
      expect(store.get(2).ticker).toBe("B");
    });
  });
});

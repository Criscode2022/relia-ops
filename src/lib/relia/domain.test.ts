import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransition,
  formatWoNumber,
  hoursFromMinutes,
  isOpenStatus,
  nextActions,
  parseMoney,
  pmCompliance,
} from "./domain.ts";

describe("work order transitions", () => {
  it("allows open → assigned and open → in_progress", () => {
    assert.equal(canTransition("open", "assigned"), true);
    assert.equal(canTransition("open", "in_progress"), true);
    assert.equal(canTransition("open", "completed"), false);
  });

  it("blocks moves out of terminal states", () => {
    assert.deepEqual(nextActions("completed"), []);
    assert.deepEqual(nextActions("cancelled"), []);
    assert.equal(canTransition("completed", "open"), false);
  });

  it("treats waiting_parts as resumable", () => {
    assert.equal(canTransition("waiting_parts", "in_progress"), true);
    assert.equal(isOpenStatus("waiting_parts"), true);
    assert.equal(isOpenStatus("completed"), false);
  });
});

describe("numbering and metrics", () => {
  it("pads work order numbers", () => {
    assert.equal(formatWoNumber(1), "REL-0001");
    assert.equal(formatWoNumber(1042), "REL-1042");
  });

  it("computes PM compliance", () => {
    assert.equal(pmCompliance(10, 2), 80);
    assert.equal(pmCompliance(0, 0), 100);
  });

  it("converts downtime minutes", () => {
    assert.equal(hoursFromMinutes(90), 1.5);
  });

  it("parses numeric money from pg numeric strings", () => {
    assert.equal(parseMoney("12.50"), 12.5);
    assert.equal(parseMoney(4), 4);
  });
});

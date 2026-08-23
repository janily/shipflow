import test from "node:test";
import assert from "node:assert/strict";
import { parseControlEnvelope } from "../src/control.js";

test("parses a valid structured control response", () => {
  const parsed = parseControlEnvelope(
    JSON.stringify({
      status: "stage_complete",
      message: "done",
      artifacts: [
        {
          kind: "ticket",
          reference: "ticket-1",
          title: "First ticket",
          blockedBy: [],
        },
      ],
    }),
  );

  assert.equal(parsed.status, "stage_complete");
  assert.equal(parsed.artifacts[0].reference, "ticket-1");
});

test("fails closed on an unknown status", () => {
  assert.throws(
    () =>
      parseControlEnvelope(
        JSON.stringify({ status: "maybe", message: "?", artifacts: [] }),
      ),
    /Unknown ShipFlow control status/,
  );
});

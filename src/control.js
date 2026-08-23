export const CONTROL_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["waiting_for_user", "stage_complete", "blocked"],
    },
    message: { type: "string" },
    artifacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["spec", "ticket", "other"] },
          reference: { type: "string" },
          title: { type: "string" },
          blockedBy: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["kind", "reference", "title", "blockedBy"],
        additionalProperties: false,
      },
    },
  },
  required: ["status", "message", "artifacts"],
  additionalProperties: false,
};

const VALID_STATUSES = new Set(["waiting_for_user", "stage_complete", "blocked"]);
const VALID_KINDS = new Set(["spec", "ticket", "other"]);

export function parseControlEnvelope(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Codex returned a non-JSON ShipFlow control response", { cause: error });
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Codex returned an invalid ShipFlow control response");
  }

  if (!VALID_STATUSES.has(parsed.status)) {
    throw new Error(`Unknown ShipFlow control status: ${String(parsed.status)}`);
  }

  if (typeof parsed.message !== "string") {
    throw new Error("ShipFlow control response is missing a string message");
  }

  if (!Array.isArray(parsed.artifacts)) {
    throw new Error("ShipFlow control response is missing artifacts");
  }

  const artifacts = parsed.artifacts.map((artifact, index) => {
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      throw new Error(`Artifact ${index + 1} is invalid`);
    }
    if (!VALID_KINDS.has(artifact.kind)) {
      throw new Error(`Artifact ${index + 1} has an invalid kind`);
    }
    if (typeof artifact.reference !== "string" || artifact.reference.length === 0) {
      throw new Error(`Artifact ${index + 1} is missing a reference`);
    }
    if (typeof artifact.title !== "string") {
      throw new Error(`Artifact ${index + 1} is missing a title`);
    }
    if (!Array.isArray(artifact.blockedBy) || artifact.blockedBy.some((value) => typeof value !== "string")) {
      throw new Error(`Artifact ${index + 1} has invalid blockedBy values`);
    }
    return {
      kind: artifact.kind,
      reference: artifact.reference,
      title: artifact.title,
      blockedBy: [...artifact.blockedBy],
    };
  });

  return {
    status: parsed.status,
    message: parsed.message,
    artifacts,
  };
}

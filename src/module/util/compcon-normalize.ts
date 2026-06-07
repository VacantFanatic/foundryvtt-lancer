import type { PackedMechData, PackedPilotData } from "./unpacking/packed-types";

// Full v3 import (rich payloads, LCP-less hydration) is tracked upstream:
// https://github.com/Eranziel/foundryvtt-lancer/issues/878

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** True when COMP/CON v3 nests pilot fields under a `data` property. */
export function isCompconV3WrappedPayload(raw: unknown): boolean {
  if (!isRecord(raw) || !isRecord(raw.data)) return false;
  const inner = raw.data;
  return typeof inner.callsign === "string" || typeof inner.name === "string";
}

function unwrapDataEnvelope(raw: Record<string, unknown>): Record<string, unknown> {
  const inner = raw.data;
  if (!isRecord(inner)) return raw;
  const { data: _nested, ...envelope } = raw;
  return { ...inner, ...envelope };
}

function normalizeMech(raw: unknown): PackedMechData {
  if (!isRecord(raw)) return raw as PackedMechData;
  return unwrapDataEnvelope(raw) as PackedMechData;
}

/**
 * Convert COMP/CON v3 save/share JSON (fields under `data`) into the flat v2 shape
 * expected by {@link importCC}.
 */
export function normalizeCompconPilotData(raw: unknown): PackedPilotData {
  if (!isRecord(raw)) {
    throw new Error("COMP/CON pilot data must be a JSON object");
  }

  let pilot = unwrapDataEnvelope(raw);

  if (Array.isArray(pilot.mechs)) {
    pilot = { ...pilot, mechs: pilot.mechs.map(entry => normalizeMech(entry)) };
  } else {
    pilot = { ...pilot, mechs: [] };
  }

  if (!Array.isArray(pilot.mechSkills) || pilot.mechSkills.length < 4) {
    pilot = { ...pilot, mechSkills: [0, 0, 0, 0] };
  }

  const packed = pilot as PackedPilotData;

  if (!packed.cloudID && packed.id) {
    packed.cloudID = packed.id;
  }

  if (!packed.callsign && !packed.name) {
    throw new Error(
      "COMP/CON pilot data is missing callsign and name. Export as V2 JSON from COMP/CON if this file is not a pilot save."
    );
  }

  return packed;
}

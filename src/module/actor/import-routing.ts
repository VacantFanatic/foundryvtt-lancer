import type { PackedPilotData, PackedPilotWrapper } from "../util/unpacking/packed-types";

export type ResolvedImportPayload =
  | { route: "v3"; wrapper: PackedPilotWrapper }
  | { route: "v2"; data: PackedPilotData };

/** Pure routing for COMP/CON JSON (file export, share code, cloud fetch). */
export function resolveImportCCPayload(
  importedData: PackedPilotData | PackedPilotWrapper
): ResolvedImportPayload | null {
  if ("EXPORT_TYPE" in importedData && "data" in importedData && importedData.data) {
    return { route: "v3", wrapper: importedData as PackedPilotWrapper };
  }
  if (("originId" in importedData || "EXPORT_TYPE" in importedData) && "callsign" in importedData) {
    return {
      route: "v3",
      wrapper: { EXPORT_TYPE: "pilot", data: importedData as PackedPilotData },
    };
  }
  if ("data" in importedData && importedData.data && !("callsign" in importedData)) {
    return { route: "v3", wrapper: { EXPORT_TYPE: "pilot", data: importedData.data } };
  }
  if ("callsign" in importedData) {
    return { route: "v2", data: importedData as PackedPilotData };
  }
  return null;
}

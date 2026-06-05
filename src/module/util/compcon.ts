import type { CachedCloudPilot } from "../interfaces";
import { LANCER } from "../config";
import type { PackedPilotData } from "./unpacking/packed-types";

// we only cache the id, cloud ids, and name; we're going to fetch all other data on user input
// the point of the cache is not have the pilot actor window to wait for network calls
// this does mean that the GM needs to refresh foundry to clear this cache if they add pilots
// (they could also re-login, we initiate a cache refresh there)

let _cache: CachedCloudPilot[] = [];
const CC_API_KEY = "fcFvjjrnQy2hypelJQi4X9dRI55r5KuI4bC07Maf";
const CC_API_URI = "https://api.compcon.app";
const CC_BUCKET_URI = "https://ds69h3g1zxwgy.cloudfront.net";

/** Alternate v3 code API used before official compcon.app v3 routes were wired in Foundry. */
const CC_V3_LEGACY_API_ENDPOINT = "https://idu55qr85i.execute-api.us-east-1.amazonaws.com/prod";
const CC_V3_LEGACY_API_KEY = "Y5DnZ4miJi30iazqn9VV73A253Db7HRxamHEQeMr";

type ProxyRequestPayload = {
  url: string;
  init?: RequestInit;
};

function getShareProxyUrl(): string {
  const proxySetting = game.settings.get(game.system.id, LANCER.setting_compcon_share_proxy);
  return typeof proxySetting === "string" ? proxySetting.trim() : "";
}

async function fetchWithOptionalShareProxy(url: string, init?: RequestInit): Promise<Response> {
  const proxyUrl = getShareProxyUrl();
  if (!proxyUrl) {
    return await fetch(url, init);
  }

  const payload: ProxyRequestPayload = {
    url,
    init: {
      method: init?.method ?? "GET",
      headers: init?.headers,
      body: init?.body,
      cache: init?.cache,
      mode: init?.mode,
      credentials: init?.credentials,
    },
  };

  return await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function cleanCloudOwnerID(str: string): string {
  return str.substring(0, 10) == "us-east-1:" ? str.substring(10) : str;
}

export async function populatePilotCache(): Promise<CachedCloudPilot[]> {
  const { Auth } = await import("@aws-amplify/auth");
  const { Storage } = await import("@aws-amplify/storage");
  try {
    await Auth.currentSession(); // refresh the token if we need to
  } catch {
    // Expected when the user is not signed into COMP/CON in Foundry; do not use console.warn
    // (some hosts surface that at error severity). Pilot cloud list stays empty until login.
    console.debug(`${LANCER.log_prefix} COMP/CON pilot cloud cache skipped (no Amplify session).`);
    return [];
  }
  const res = await Storage.list("pilot", {
    level: "protected",
    cacheControl: "no-cache",
    // Filter out deleted pilots (tagged with "delete" or "s3-remove-flag"), we want "active"
  }).then(result => {
    return result.results.filter(x => x.key?.endsWith("--active"));
  });

  const data = (await Promise.all(res.map(obj => (obj.key ? fetchPilot(obj.key) : null)))).map(
    x => x
  ) as Array<PackedPilotData>;
  data.forEach(pilot => {
    pilot.mechs = [];
    pilot.cloudOwnerID = pilot.cloudOwnerID != null ? cleanCloudOwnerID(pilot.cloudOwnerID) : ""; // only clean the CloudOwnerID if its available
    pilot.cloudID = pilot.cloudID != null ? pilot.cloudID : pilot.id; // if cloudID is present in the data being returned, use it. Otherwise, use the ID for selection purposes
  });
  _cache = data;
  return data;
}

export function pilotCache(): CachedCloudPilot[] {
  return _cache;
}

export async function fetchV2PilotViaShareCode(sharecode: string): Promise<PackedPilotData> {
  const shareCodeResponse = await fetchWithOptionalShareProxy(
    `${CC_API_URI}/share?code=${encodeURIComponent(sharecode)}`,
    {
      headers: {
        "x-api-key": CC_API_KEY,
      },
    }
  );

  if (!shareCodeResponse.ok) {
    throw new Error(`V2 share endpoint returned HTTP ${shareCodeResponse.status}`);
  }

  const shareObj = await shareCodeResponse.json();
  if (!shareObj?.presigned) {
    throw new Error("V2 share endpoint did not return a presigned URL");
  }

  const pilotResponse = await fetchWithOptionalShareProxy(shareObj["presigned"]);
  if (!pilotResponse.ok) {
    throw new Error(`V2 presigned pilot fetch returned HTTP ${pilotResponse.status}`);
  }
  return await pilotResponse.json();
}

/**
 * Fetches multiple pilot share codes from CCv3 at once (official compcon.app API).
 */
export async function fetchV3PilotViaShareCodes(sharecodes: string[]): Promise<PackedPilotData[]> {
  const shareCodeResponse = await fetchWithOptionalShareProxy(
    `${CC_API_URI}/v3/code?codes=${encodeURIComponent(JSON.stringify(sharecodes))}&scope=items`,
    {
      headers: {
        "x-api-key": CC_API_KEY,
      },
    }
  );

  if (!shareCodeResponse.ok) {
    throw new Error(`V3 share endpoint returned HTTP ${shareCodeResponse.status}`);
  }

  const sourceObjs: { uri: string }[] = await shareCodeResponse.json();
  const sources = sourceObjs.map(o => o.uri);

  return Promise.all(
    sources.map(source =>
      fetchWithOptionalShareProxy(`${CC_BUCKET_URI}/${source}`, { cache: "no-cache" }).then(res => {
        if (!res.ok) throw new Error(`V3 pilot fetch returned HTTP ${res.status}`);
        return res.json();
      })
    )
  );
}

/**
 * Wrapper for `fetchV3PilotViaShareCodes`
 */
export async function fetchV3PilotViaShareCode(sharecode: string): Promise<PackedPilotData> {
  try {
    return (await fetchV3PilotViaShareCodes([sharecode]))[0];
  } catch (officialErr) {
    return await fetchPilotViaLegacyV3ShareCode(sharecode, officialErr);
  }
}

async function fetchPilotViaLegacyV3ShareCode(sharecode: string, officialErr: unknown): Promise<PackedPilotData> {
  const query = new URL(`${CC_V3_LEGACY_API_ENDPOINT}/code`);
  query.searchParams.append("scope", "download");
  query.searchParams.append("codes", JSON.stringify([sharecode]));

  const codeLookupResponse = await fetchWithOptionalShareProxy(query.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CC_V3_LEGACY_API_KEY,
    },
  });

  if (!codeLookupResponse.ok) {
    const legacyMsg = officialErr instanceof Error ? officialErr.message : String(officialErr);
    throw new Error(
      `V3 share import failed (official API and legacy API). Official: ${legacyMsg}; legacy HTTP ${codeLookupResponse.status}`
    );
  }

  const codeLookupJson = await codeLookupResponse.json();
  if (!codeLookupJson?.uri) {
    throw new Error("V3 legacy share endpoint did not return a downloadable URI");
  }

  const pilotResponse = await fetchWithOptionalShareProxy(`${CC_BUCKET_URI}/${codeLookupJson.uri}`, {
    cache: "no-cache",
  });
  if (!pilotResponse.ok) {
    throw new Error(`V3 legacy cloudfront pilot fetch returned HTTP ${pilotResponse.status}`);
  }

  return (await pilotResponse.json()) as PackedPilotData;
}

/** Tries v3 then v2 share endpoints when code format is unknown. */
export async function fetchPilotViaShareCode(sharecode: string): Promise<PackedPilotData> {
  const trimmedCode = sharecode.trim();
  let v3Error: unknown = null;
  try {
    return await fetchV3PilotViaShareCode(trimmedCode);
  } catch (err) {
    v3Error = err;
  }

  try {
    return await fetchV2PilotViaShareCode(trimmedCode);
  } catch (legacyErr) {
    const v3Message = v3Error instanceof Error ? v3Error.message : String(v3Error);
    const legacyMessage = legacyErr instanceof Error ? legacyErr.message : String(legacyErr);
    const proxyUrl = getShareProxyUrl();
    if (!proxyUrl && v3Message.includes("Failed to fetch") && legacyMessage.includes("Failed to fetch")) {
      throw new Error(
        "All share-code import paths failed with browser fetch errors. This is usually CORS blocking for localhost origins. Use JSON import, or set a COMP/CON Share Import Proxy URL in System Settings."
      );
    }
    throw new Error(`All share-code import paths failed. v3: ${v3Message}; v2: ${legacyMessage}`);
  }
}

export async function fetchPilotViaCache(cachedPilot: CachedCloudPilot): Promise<PackedPilotData> {
  const sanitizedName = cachedPilot.name.replace(/[^a-zA-Z\d\s:]/g, " ");
  const documentID = `pilot/${sanitizedName}--${cachedPilot.id}--active`;
  const { Storage } = await import("@aws-amplify/storage");
  const req: any = {
    level: "protected",
    download: true,
    cacheControl: "no-cache",
  };

  const res = (await Storage.get(documentID, req)) as any;
  const text = await res.Body.text();
  const json = JSON.parse(text);
  return json;
}

export async function fetchPilot(cloudID: string, cloudOwnerID?: string): Promise<PackedPilotData> {
  // we're just gonna. accept all possible forms of this. let's not fuss.
  if (!cloudOwnerID && cloudID.includes("//")) {
    // only one argument, new-style vault id
    [cloudOwnerID, cloudID] = cloudID.split("//");
  }
  if (cloudID.substring(0, 6) != "pilot/") {
    cloudID = "pilot/" + cloudID;
  }
  if (cloudOwnerID && cloudOwnerID.substring(0, 10) != "us-east-1:") {
    cloudOwnerID = "us-east-1:" + cloudOwnerID;
  }
  try {
    const { Auth } = await import("@aws-amplify/auth");
    await Auth.currentSession(); // refresh the token if we need to
  } catch (e) {
    ui.notifications!.error("Sync failed - you aren't logged into a Comp/Con account.");
    throw e;
  }

  const { Storage } = await import("@aws-amplify/storage");
  const req: any = {
    level: "protected",
    download: true,
    cacheControl: "no-cache",
  };
  if (cloudOwnerID) {
    req.identityId = cloudOwnerID;
  }
  const res = (await Storage.get(cloudID, req)) as any;
  const text = await res.Body.text();
  return JSON.parse(text);
}

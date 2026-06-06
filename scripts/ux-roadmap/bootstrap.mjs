#!/usr/bin/env node
/**
 * Bootstrap the UX Roadmap 2026 GitHub Project, milestones, labels, and tracking issues.
 *
 * Usage:
 *   node scripts/ux-roadmap/bootstrap.mjs              # full bootstrap (needs project scope + owner perms)
 *   node scripts/ux-roadmap/bootstrap.mjs --issues-only
 *   node scripts/ux-roadmap/bootstrap.mjs --project-only   # add existing issues to project
 *   node scripts/ux-roadmap/bootstrap.mjs --dry-run
 *
 * Requires: gh CLI authenticated with repo + project scopes.
 * Run as VacantFanatic (or a user with permission to create Projects on the owner account).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const roadmapPath = path.join(__dirname, "roadmap.json");
const statePath = path.join(__dirname, "bootstrap-state.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const issuesOnly = args.has("--issues-only");
const projectOnly = args.has("--project-only");

const roadmap = JSON.parse(fs.readFileSync(roadmapPath, "utf8"));
const { project, labels, milestones, releases, prs } = roadmap;
const REPO = `${project.owner}/${project.repo}`;

function log(...parts) {
  console.log("[ux-roadmap]", ...parts);
}

function gh(args, opts = {}) {
  const cmd = ["gh", ...args];
  if (dryRun) {
    log("DRY", cmd.join(" "));
    return opts.default ?? "";
  }
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    const stderr = e.stderr?.toString() ?? e.message;
    throw new Error(`gh ${args.join(" ")} failed: ${stderr}`);
  }
}

function graphql(query, variables = {}) {
  const varArgs = Object.entries(variables).flatMap(([k, v]) => ["-f", `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`]);
  if (dryRun) {
    log("DRY graphql", query.slice(0, 80).replace(/\s+/g, " "));
    return {};
  }
  const out = gh(["api", "graphql", "-f", `query=${query}`, ...varArgs]);
  const parsed = JSON.parse(out);
  if (parsed.errors?.length) {
    throw new Error(parsed.errors.map(e => e.message).join("; "));
  }
  return parsed.data;
}

function loadState() {
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  }
  return { issues: {}, project: null, fields: {} };
}

function saveState(state) {
  if (!dryRun) {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
  }
}

function releaseMilestoneTitle(releaseId) {
  const m = milestones.find(ms => ms.title.startsWith(`v${releaseId}`));
  return m?.title ?? `v${releaseId}`;
}

function createLabels() {
  log("Creating labels...");
  for (const label of labels) {
    try {
      gh([
        "api",
        `repos/${REPO}/labels`,
        "-f",
        `name=${label.name}`,
        "-f",
        `color=${label.color}`,
        "-f",
        `description=${label.description}`,
      ]);
      log("  label", label.name);
    } catch (e) {
      if (String(e).includes("already_exists")) {
        log("  label exists", label.name);
      } else {
        log("  label skip", label.name, "-", e.message.split("\n")[0]);
      }
    }
  }
}

function createMilestones(state) {
  log("Creating milestones...");
  state.milestones = state.milestones ?? {};
  for (const ms of milestones) {
    if (state.milestones[ms.title]) continue;
    try {
      const res = JSON.parse(
        gh([
          "api",
          `repos/${REPO}/milestones`,
          "-f",
          `title=${ms.title}`,
          "-f",
          `description=${ms.description}`,
        ])
      );
      state.milestones[ms.title] = res.number;
      log("  milestone", ms.title, "#" + res.number);
    } catch (e) {
      log("  milestone skip", ms.title, "-", e.message.split("\n")[0]);
    }
  }
}

function issueLabels(kind, priority) {
  const p = priority?.toLowerCase() ?? "p1";
  return ["ux-roadmap", kind === "epic" ? "ux/epic" : "ux/pr", `priority/${p}`];
}

function createIssue(title, body, { milestone, labels: labelNames = [] }) {
  const minimal = ["issue", "create", "-R", REPO, "--title", title, "--body", body];
  const withMilestone = milestone ? [...minimal, "-m", milestone] : minimal;
  const withLabels = [...withMilestone];
  for (const l of labelNames) {
    withLabels.push("-l", l);
  }

  const attempts = [
    labelNames.length ? withLabels : withMilestone,
    withMilestone,
    minimal,
  ];
  const seen = new Set();
  let lastError;
  for (const args of attempts) {
    const key = args.join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const url = gh(args);
      const num = parseInt(url.split("/").pop(), 10);
      log("  issue", `#${num}`, title);
      return num;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function prBody(pr, state) {
  const release = releases.find(r => r.id === pr.release);
  const deps = pr.dependsOn
    .map(id => {
      const n = state.issues.pr?.[id];
      return n ? `#${n}` : `PR${id}`;
    })
    .join(", ");
  const releaseIssue = state.issues.release?.[pr.release];

  return `## UX Roadmap — PR ${pr.id}

| Field | Value |
|-------|-------|
| **Release** | v${pr.release} (${release?.semver ?? "minor"}) |
| **Branch** | \`${pr.branch}\` |
| **Priority** | ${pr.priority} |
| **Sprint** | ${release?.sprint ?? "—"} |
| **Parallel** | ${pr.parallel ? "Yes" : "No — merge in order"} |
| **Depends on** | ${deps || "None"} |
| **Release epic** | ${releaseIssue ? `#${releaseIssue}` : `v${pr.release}`} |

### Summary
${pr.title}

### Files (expected)
${pr.files.map(f => `- \`${f}\``).join("\n")}

### Acceptance criteria
${pr.acceptance.map(a => `- [ ] ${a}`).join("\n")}

### Test plan
- [ ] \`npm run test\`
- [ ] \`SKIP_FOUNDRY_DIST_MIRROR=1 npm run build\`
- [ ] Foundry smoke: relevant actor sheet / combat flow

### Changelog
Add entries under the **v${pr.release}** section in \`CHANGELOG.md\` when implementing.

---
_Tracking issue for [UX Roadmap 2026](https://github.com/${REPO}/issues/${state.issues.epic}). Do not implement in this issue — open \`${pr.branch}\` instead._
`;
}

function releaseBody(rel, state) {
  const prIds = prs.filter(p => p.release === rel.id).map(p => state.issues.pr?.[p.id]).filter(Boolean);
  return `## UX Roadmap — Release v${rel.id}

| Field | Value |
|-------|-------|
| **Semver bump** | ${rel.semver} |
| **Sprint** | ${rel.sprint} |
| **Priority** | ${rel.priority} |

### Summary
${rel.summary}

### PR issues in this release
${prIds.map(n => `- [ ] #${n}`).join("\n")}

### Release checklist
- [ ] All PR issues closed
- [ ] \`CHANGELOG.md\` section for v${rel.id}
- [ ] \`npm version ${rel.semver === "patch" ? "patch" : rel.semver === "major" ? "major" : "minor"}\`
- [ ] Foundry Docker smoke test (AGENTS.md)
- [ ] GitHub release tag \`v${rel.id}\`

---
Epic: #${state.issues.epic}
`;
}

function epicBody() {
  return `## UX Roadmap 2026

Master tracker for the Foundry VTT Lancer UX pass (baseline **v2.12.10**).

### GitHub Project
Run \`node scripts/ux-roadmap/bootstrap.mjs\` (as repo owner with \`project\` scope) to create or refresh the [**UX Roadmap 2026**](https://github.com/users/${project.owner}/projects) board with Roadmap, Table, and Board views.

### Releases
${releases.map(r => `- **v${r.id}** (${r.semver}) — ${r.title}`).join("\n")}

### Execution order
| Sprint | Releases |
|--------|----------|
| A | v2.12.11 (all PRs parallel) |
| B | v2.13.0 |
| C | v2.14.0 |
| D | v2.15.0 |
| E | v2.16.0 |
| F | v2.17.0 – v2.19.0 |
| G | v2.20.0 (+ optional v3.0.0) |

### Source of truth
- Data: \`scripts/ux-roadmap/roadmap.json\`
- Bootstrap: \`scripts/ux-roadmap/bootstrap.mjs\`

### Notes
- Cloud agent branches use suffix \`-4b38\`
- PRs target \`VacantFanatic/foundryvtt-lancer\` → \`master\`
`;
}

function createIssues(state) {
  log("Creating tracking issues...");

  if (!state.issues.epic) {
    state.issues.epic = createIssue(
      "[UX Epic] UX Roadmap 2026",
      epicBody(),
      { labels: issueLabels("epic", "P0") },
    );
  }

  state.issues.release = state.issues.release ?? {};
  for (const rel of releases) {
    if (state.issues.release[rel.id]) continue;
    state.issues.release[rel.id] = createIssue(
      `[UX Release v${rel.id}] ${rel.title.replace(/^v[\d.]+ — /, "")}`,
      releaseBody(rel, state),
      {
        milestone: releaseMilestoneTitle(rel.id),
        labels: issueLabels("epic", rel.priority),
      },
    );
  }

  state.issues.pr = state.issues.pr ?? {};
  for (const pr of prs) {
    if (state.issues.pr[pr.id]) continue;
    state.issues.pr[pr.id] = createIssue(
      `[UX PR${pr.id}] ${pr.title}`,
      prBody(pr, state),
      {
        milestone: releaseMilestoneTitle(pr.release),
        labels: issueLabels("pr", pr.priority),
      },
    );
  }

  // Refresh epic body with issue links
  if (!dryRun && state.issues.epic) {
    const epicNum = state.issues.epic;
    const updated = epicBody() + "\n### Release issues\n" +
      releases.map(r => `- v${r.id}: #${state.issues.release[r.id]}`).join("\n");
    try {
      gh(["issue", "edit", String(epicNum), "-R", REPO, "--body", updated]);
    } catch {
      log("Could not update epic body (permission); issues still created.");
    }
  }
}

function getOwnerId() {
  const q = `query($login:String!){ user(login:$login){ id } }`;
  const data = graphql(q, { login: project.owner });
  return data.user?.id;
}

function createProject(state) {
  log("Creating GitHub Project...");
  const ownerId = getOwnerId();
  if (!ownerId) throw new Error(`Could not resolve owner ${project.owner}`);

  const createQ = `
    mutation($input: CreateProjectV2Input!) {
      createProjectV2(input: $input) {
        projectV2 { id number title url }
      }
    }`;
  const created = graphql(createQ, {
    input: { ownerId, title: project.title },
  });
  const proj = created.createProjectV2.projectV2;
  state.project = { id: proj.id, number: proj.number, url: proj.url };
  log("  project", proj.url);

  const linkQ = `
    mutation($projectId:ID!, $repoId:ID!) {
      linkProjectV2ToRepository(input: {projectId: $projectId, repositoryId: $repoId}) {
        repository { name }
      }
    }`;
  const repoNode = JSON.parse(gh(["api", `repos/${REPO}`, "--jq", ".node_id"]));
  graphql(linkQ, { projectId: proj.id, repoId: repoNode });

  const fields = [
    { name: "Type", dataType: "SINGLE_SELECT", options: ["Epic", "Release", "PR"] },
    { name: "Release", dataType: "SINGLE_SELECT", options: releases.map(r => `v${r.id}`) },
    { name: "Sprint", dataType: "SINGLE_SELECT", options: ["A", "B", "C", "D", "E", "F", "G"] },
    { name: "Priority", dataType: "SINGLE_SELECT", options: ["P0", "P1", "P2"] },
    { name: "PR #", dataType: "NUMBER" },
  ];

  state.fields = {};
  for (const field of fields) {
    const fieldQ = `
      mutation($input: CreateProjectV2FieldInput!) {
        createProjectV2Field(input: $input) {
          projectV2Field { ... on ProjectV2FieldCommon { id name } }
        }
      }`;
    const input = {
      projectId: proj.id,
      name: field.name,
      dataType: field.dataType,
    };
    if (field.dataType === "SINGLE_SELECT") {
      input.singleSelectOptions = field.options.map(name => ({ name, color: "GRAY", description: "" }));
    }
    const res = graphql(fieldQ, { input: JSON.stringify(input) });
    const f = res.createProjectV2Field.projectV2Field;
    state.fields[field.name] = f.id;
    log("  field", field.name);
  }

  return proj;
}

function getFieldOptionIds(projectId, fieldId) {
  const q = `
    query($projectId: ID!, $fieldId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          field(name: "") { id }
        }
      }
    }`;
  // fetch all fields with options
  const fq = `
    query($id: ID!) {
      node(id: $id) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id name
                options { id name }
              }
            }
          }
        }
      }
    }`;
  const data = graphql(fq, { id: projectId });
  const map = {};
  for (const node of data.node.fields.nodes) {
    if (node.options) {
      map[node.name] = { id: node.id, options: Object.fromEntries(node.options.map(o => [o.name, o.id])) };
    } else if (node.id) {
      map[node.name] = { id: node.id };
    }
  }
  return map;
}

function addIssueToProject(projectId, issueNodeId, fieldMap, itemMeta, state) {
  const addQ = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }`;
  const added = graphql(addQ, { projectId, contentId: issueNodeId });
  const itemId = added.addProjectV2ItemById.item.id;

  const setField = (fieldName, optionName) => {
    const field = fieldMap[fieldName];
    if (!field?.options?.[optionName]) return;
    const mut = `
      mutation($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) { projectV2Item { id } }
      }`;
    graphql(mut, {
      input: JSON.stringify({
        projectId,
        itemId,
        fieldId: field.id,
        value: { singleSelectOptionId: field.options[optionName] },
      }),
    });
  };

  const setNumber = (fieldName, num) => {
    const field = fieldMap[fieldName];
    if (!field?.id) return;
    const mut = `
      mutation($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) { projectV2Item { id } }
      }`;
    graphql(mut, {
      input: JSON.stringify({
        projectId,
        itemId,
        fieldId: field.id,
        value: { number: num },
      }),
    });
  };

  setField("Type", itemMeta.type);
  if (itemMeta.release) setField("Release", `v${itemMeta.release}`);
  if (itemMeta.sprint) setField("Sprint", itemMeta.sprint);
  if (itemMeta.priority) setField("Priority", itemMeta.priority);
  if (itemMeta.prNumber != null) setNumber("PR #", itemMeta.prNumber);
}

function populateProject(state) {
  if (!state.project?.id) {
    createProject(state);
  }
  const projectId = state.project.id;
  log("Populating project items...");

  const fieldMap = getFieldOptionIds(projectId);

  const addByNumber = (num, meta) => {
    const nodeId = gh(["api", `repos/${REPO}/issues/${num}`, "--jq", ".node_id"]);
    addIssueToProject(projectId, nodeId, fieldMap, meta, state);
    log("  added", `#${num}`, meta.type);
  };

  addByNumber(state.issues.epic, { type: "Epic", priority: "P0", sprint: "A" });

  for (const rel of releases) {
    const num = state.issues.release[rel.id];
    addByNumber(num, { type: "Release", release: rel.id, sprint: rel.sprint, priority: rel.priority });
  }

  for (const pr of prs) {
    const num = state.issues.pr[pr.id];
    const rel = releases.find(r => r.id === pr.release);
    addByNumber(num, {
      type: "PR",
      release: pr.release,
      sprint: rel?.sprint,
      priority: pr.priority,
      prNumber: pr.id,
    });
  }

  log("Project ready:", state.project.url);
  log("Configure a Roadmap view in the UI: Layout → Roadmap, group by Release, sort by PR #.");
}

async function main() {
  log("Repo:", REPO);
  const state = loadState();
  state.issues = state.issues ?? {};

  if (!projectOnly) {
    createLabels();
    createMilestones(state);
    createIssues(state);
    saveState(state);
  }

  if (!issuesOnly) {
    try {
      populateProject(state);
      saveState(state);
    } catch (e) {
      console.error("\n[ux-roadmap] Project creation failed (issues may still have been created):");
      console.error(e.message);
      console.error("\nRun as VacantFanatic with: gh auth refresh -s project,read:org");
      console.error("Then: node scripts/ux-roadmap/bootstrap.mjs --project-only");
      process.exitCode = 1;
    }
  }

  log("Done. State:", statePath);
  if (state.issues.epic) {
    log("Epic:", `https://github.com/${REPO}/issues/${state.issues.epic}`);
  }
}

main();

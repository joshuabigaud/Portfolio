// Technologies observed in the portfolio and application source on 2026-10-06.
// These records describe project/workflow use, not proficiency or qualifications.
// Keep the supporting source notes in ASSET_PROVENANCE.md current when editing.
export const stackCategories = [
  { id: 'languages', label: 'Languages', color: '#e9dfa8' },
  { id: 'interfaces', label: 'Interfaces', color: '#dfdcea' },
  { id: 'apps-data', label: 'Apps & data', color: '#d9e3da' },
  { id: 'workflow', label: 'Workflow', color: '#e6d8cd' },
];

export const stackItems = [
  {
    id: 'javascript', name: 'JavaScript', symbol: 'Js', categoryId: 'languages',
    description: 'Browser interactions and build scripts in this portfolio, including navigation, the flip badge, project selection, and the static page generator.',
  },
  {
    id: 'typescript', name: 'TypeScript', symbol: 'Ts', categoryId: 'languages',
    description: 'Typed application code across Nomi, Omin, Nebula, and PatchMind, covering interfaces, local services, and development tooling.',
  },
  {
    id: 'python', name: 'Python', symbol: 'Py', categoryId: 'languages',
    description: 'OuroShield’s local service and review tooling, alongside scripts for preparing the portfolio avatar and creative assets.',
  },
  {
    id: 'html', name: 'HTML', symbol: 'Ht', categoryId: 'languages',
    description: 'The structure of this portfolio: readable page sections, native project disclosures, accessible controls, and content that works without JavaScript.',
  },
  {
    id: 'css', name: 'CSS', symbol: 'Cs', categoryId: 'languages',
    description: 'Responsive layouts, typography, the periodic-table tiles, and the badge’s 3D flip in this portfolio, including reduced-motion styles.',
  },
  {
    id: 'sql', name: 'SQL', symbol: 'Sq', categoryId: 'languages',
    description: 'Database schemas, queries, and migrations in the local storage layers of Omin and OuroShield.',
  },
  {
    id: 'react', name: 'React', symbol: 'Re', categoryId: 'interfaces',
    description: 'Component-based interfaces in Nomi, Omin, Nebula, OuroShield, and PatchMind. It is part of those application stacks; this portfolio uses plain HTML and JavaScript.',
  },
  {
    id: 'tailwindcss', name: 'Tailwind CSS', symbol: 'Tw', categoryId: 'interfaces',
    description: 'Utility-based styling in Nebula’s interface, used alongside its shared styles and visual components.',
  },
  {
    id: 'vite', name: 'Vite', symbol: 'Vi', categoryId: 'interfaces',
    description: 'Local interface development and production builds in Nebula, OuroShield, and PatchMind. Nomi uses the Electron-focused electron-vite build tooling.',
  },
  {
    id: 'threejs', name: 'Three.js', symbol: '3D', categoryId: 'interfaces',
    description: 'The interactive avatar on this page and 3D project visualization in Nebula. Here it loads and rotates an existing fixed-pose model.',
  },
  {
    id: 'react-flow', name: 'React Flow', symbol: 'Rf', categoryId: 'interfaces',
    description: 'The connected-node workflow editor in Omin’s Control Center, providing a canvas for steps, ports, and connections.',
  },
  {
    id: 'nodejs', name: 'Node.js', symbol: 'No', categoryId: 'apps-data',
    description: 'Local application services, build scripts, and development commands. It also runs this portfolio’s static generator and local preview server.',
  },
  {
    id: 'electron', name: 'Electron', symbol: 'El', categoryId: 'apps-data',
    description: 'Desktop application shells in Nomi, Omin, Nebula, and PatchMind, connecting their web interfaces with local application capabilities.',
  },
  {
    id: 'fastapi', name: 'FastAPI', symbol: 'Fa', categoryId: 'apps-data',
    description: 'OuroShield’s Python API layer, connecting its review dashboard and testing interface to local services.',
  },
  {
    id: 'sqlite', name: 'SQLite', symbol: 'Sl', categoryId: 'apps-data',
    description: 'Local persistence in Omin and OuroShield for project state, workflow records, and review or testing data.',
  },
  {
    id: 'postgresql', name: 'PostgreSQL', symbol: 'Pg', categoryId: 'apps-data',
    description: 'A supported workspace-storage option implemented in Nebula’s server. The storage backend is selected through project configuration.',
  },
  {
    id: 'zod', name: 'Zod', symbol: 'Zd', categoryId: 'apps-data',
    description: 'Structured input validation in Omin’s local API, used to check data before application services act on it.',
  },
  {
    id: 'codex', name: 'Codex', symbol: 'Cx', categoryId: 'workflow',
    description: 'AI-assisted planning, implementation, debugging, and review in the development workflow, including this portfolio. AI assistance is part of how the work is built and refined.',
  },
  {
    id: 'git', name: 'Git', symbol: 'Gt', categoryId: 'workflow',
    description: 'Repository history and change-review workflows across the application projects. PatchMind also uses Git to inspect and prepare reviewable changes.',
  },
  {
    id: 'powershell', name: 'PowerShell', symbol: 'Ps', categoryId: 'workflow',
    description: 'Windows development commands, local builds, and test workflows, including the commands used to build and verify this portfolio.',
  },
  {
    id: 'blender', name: 'Blender', symbol: 'Bl', categoryId: 'workflow',
    description: 'Scripted preparation and rendering of the portfolio’s existing 3D avatar, including mesh reduction, scene setup, and the transparent poster image.',
  },
  {
    id: 'playwright', name: 'Playwright', symbol: 'Pw', categoryId: 'workflow',
    description: 'Browser and Electron interaction checks in the application projects, including Omin’s Control Center tests and OuroShield’s rendered dashboard checks.',
  },
  {
    id: 'vitest', name: 'Vitest', symbol: 'Vt', categoryId: 'workflow',
    description: 'Automated code and component checks in projects such as PatchMind and OuroShield, as part of the development and review workflow.',
  },
  {
    id: 'npm', name: 'npm', symbol: 'Np', categoryId: 'workflow',
    description: 'Dependency installation and repeatable build, test, and preview commands for this portfolio and projects including PatchMind and OuroShield.',
  },
];

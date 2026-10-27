import type { Project } from "@/lib/content/schema"

const originalSelection = new Set(["corso-velle", "tajwater", "igac", "igacmun-session-iii"])

/** Existing content keeps its selection until the owner explicitly edits the toggle. */
export function isStudioProject(project: Project) {
  return project.studio ?? originalSelection.has(project.slug)
}
export function studioProjects(projects: Project[]) {
  return projects.filter((project) => !project.hidden && isStudioProject(project))
}

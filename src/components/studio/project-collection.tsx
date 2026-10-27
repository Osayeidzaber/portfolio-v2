"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import type { Project } from "@/lib/content/schema"

type Work = Pick<Project, "slug" | "title" | "description" | "category" | "thumbnail" | "tech">

export function ProjectCollection({ projects }: { projects: Work[] }) {
  const [category, setCategory] = useState("All work")
  const categories = ["All work", ...new Set(projects.map((project) => project.category))]
  const filtered = category === "All work" ? projects : projects.filter((project) => project.category === category)
  return <>
    <div className="oz-work-tools"><div className="oz-work-filters" role="group" aria-label="Filter studio projects">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}<span aria-hidden>{String(item === "All work" ? projects.length : projects.filter((project) => project.category === item).length).padStart(2, "0")}</span></button>)}</div><p className="oz-label" role="status">{filtered.length} {filtered.length === 1 ? "PROJECT" : "PROJECTS"}</p></div>
    <div className="oz-project-grid">{filtered.map((project) => <Link key={project.slug} href={`/oz-studio/work/${project.slug}`} className="oz-project">
      <div className="oz-project-image">{project.thumbnail ? <Image src={project.thumbnail} alt={`${project.title} website`} fill sizes="(max-width: 720px) 100vw, 50vw" unoptimized /> : <span>{project.title}</span>}<span className="oz-project-open" aria-hidden>↗</span><span className="oz-project-index oz-label" aria-hidden>{String(projects.findIndex((item) => item.slug === project.slug) + 1).padStart(2, "0")} / SELECTED WORK</span></div>
      <div className="oz-project-heading"><span className="oz-label">{String(projects.findIndex((item) => item.slug === project.slug) + 1).padStart(2, "0")}</span><h3>{project.title}</h3><span className="oz-label">{project.category}</span></div><p>{project.description}</p>
      <div className="oz-project-foot"><span className="oz-label">{project.tech.slice(0, 3).join(" / ")}</span><span>Explore project <span aria-hidden>↗</span></span></div>
    </Link>)}</div>
  </>
}

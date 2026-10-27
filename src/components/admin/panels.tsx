"use client"

import type { EditorState } from "@/app/admin/actions"
import type { Achievement, Experience, Project, SiteContent } from "@/lib/content/schema"
import { sectionKeys } from "@/lib/content/schema"
import { slugify } from "@/lib/projects"

import { useConfirm } from "./confirm"
import { Card, FileField, Panel, Select, TagInput, TextArea, TextField, Toggle } from "./fields"
import { SortableList } from "./sortable"

export type Mutate = (fn: (draft: SiteContent) => void) => void

/** Client-only stable keys so rows keep focus while you edit; the server schema strips them. */
type Keyed = { _key?: string }
export const keyOf = (item: object, i: number) => (item as Keyed)._key ?? String(i)
export const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()))

const RemoveButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick} className="pill h-10 px-3 text-[14px] text-dust hover:text-paper" aria-label={label}>
    Delete
  </button>
)

/* ---------------- Profile ---------------- */

export function ProfilePanel({ c, mutate }: { c: SiteContent; mutate: Mutate }) {
  const p = c.profile
  const confirm = useConfirm()
  return (
    <Panel title="Profile" description="Your name, the hero lines, contact details and links.">
      <Card className="grid gap-5 md:grid-cols-2">
        <TextField label="Full name" value={p.name} path="profile.name" onChange={(v) => mutate((d) => void (d.profile.name = v))} />
        <TextField label="Professional title" value={p.title} path="profile.title" onChange={(v) => mutate((d) => void (d.profile.title = v))} />
        <div className="md:col-span-2">
          <TextArea label="Introduction (hero)" rows={3} value={p.intro} path="profile.intro" onChange={(v) => mutate((d) => void (d.profile.intro = v))} />
        </div>
        <div className="md:col-span-2">
          <TagInput label="Rotating roles in the hero" value={p.roles} path="profile.roles" onChange={(v) => mutate((d) => void (d.profile.roles = v))} hint="Shown one at a time after “I build…”. Also used for the ribbon." />
        </div>
        <TextField label="Location" value={p.location} path="profile.location" onChange={(v) => mutate((d) => void (d.profile.location = v))} />
        <TextField label="Email" type="email" value={p.email} path="profile.email" onChange={(v) => mutate((d) => void (d.profile.email = v))} />
        <TextField label="Alternate email" type="email" value={p.alternateEmail} path="profile.alternateEmail" onChange={(v) => mutate((d) => void (d.profile.alternateEmail = v))} />
        <Select
          label="Availability"
          value={p.availability.status}
          onChange={(v) => mutate((d) => void (d.profile.availability.status = v as typeof p.availability.status))}
          options={[
            { value: "available", label: "Available" },
            { value: "limited", label: "Limited availability" },
            { value: "unavailable", label: "Not taking work" },
          ]}
        />
        <TextField label="Availability label" value={p.availability.label} path="profile.availability.label" onChange={(v) => mutate((d) => void (d.profile.availability.label = v))} />
        <FileField label="Profile picture" value={p.avatar} path="profile.avatar" hint="Leave empty to use your GitHub avatar." onChange={(v) => mutate((d) => void (d.profile.avatar = v))} />
        <FileField
          label="Résumé (PDF)"
          kind="document"
          accept="application/pdf"
          value={p.resume}
          path="profile.resume"
          hint="Adds a Résumé link to the contact section."
          onChange={(v) => mutate((d) => void (d.profile.resume = v))}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-semibold">Social links</h3>
          <button
            type="button"
            className="pill pill-line h-10 px-4 text-[14px]"
            onClick={() => mutate((d) => void d.profile.socials.push({ label: "", url: "https://", _key: newKey() } as never))}
          >
            + Add link
          </button>
        </div>
        <SortableList
          label="Social links"
          items={p.socials}
          getId={keyOf}
          onChange={(next) => mutate((d) => void (d.profile.socials = next))}
          render={(s, i) => (
            <div className="grid gap-3 rounded-[12px] border border-rule p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <TextField label="Label" value={s.label} path={`profile.socials.${i}.label`} onChange={(v) => mutate((d) => void (d.profile.socials[i].label = v))} />
              <TextField label="URL" type="url" value={s.url} path={`profile.socials.${i}.url`} onChange={(v) => mutate((d) => void (d.profile.socials[i].url = v))} />
              <RemoveButton
                label={`Delete ${s.label || "link"}`}
                onClick={async () => {
                  if (await confirm({ title: `Delete ${s.label || "this link"}?`, confirm: "Delete" }))
                    mutate((d) => void d.profile.socials.splice(i, 1))
                }}
              />
            </div>
          )}
        />
      </Card>

      <Card className="flex flex-col gap-5">
        <h3 className="text-[18px] font-semibold">About section</h3>
        <TextField label="Heading" value={c.about.heading} path="about.heading" onChange={(v) => mutate((d) => void (d.about.heading = v))} />
        {c.about.paragraphs.map((para, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <TextArea label={`Paragraph ${i + 1}`} value={para} path={`about.paragraphs.${i}`} onChange={(v) => mutate((d) => void (d.about.paragraphs[i] = v))} />
            </div>
            {c.about.paragraphs.length > 1 && (
              <RemoveButton label={`Delete paragraph ${i + 1}`} onClick={() => mutate((d) => void d.about.paragraphs.splice(i, 1))} />
            )}
          </div>
        ))}
        <button type="button" className="pill pill-line h-10 self-start px-4 text-[14px]" onClick={() => mutate((d) => void d.about.paragraphs.push(""))}>
          + Add paragraph
        </button>
        <TextField label="Quote under the portrait" value={c.about.quote} path="about.quote" onChange={(v) => mutate((d) => void (d.about.quote = v))} />
        <h4 className="pt-2 text-[15px] font-semibold">Pillars</h4>
        <SortableList
          label="About pillars"
          items={c.about.pillars}
          getId={keyOf}
          onChange={(next) => mutate((d) => void (d.about.pillars = next))}
          render={(pl, i) => (
            <div className="grid gap-3 rounded-[12px] border border-rule p-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
              <TextField label="Title" value={pl.title} path={`about.pillars.${i}.title`} onChange={(v) => mutate((d) => void (d.about.pillars[i].title = v))} />
              <TextField label="Text" value={pl.body} path={`about.pillars.${i}.body`} onChange={(v) => mutate((d) => void (d.about.pillars[i].body = v))} />
              <RemoveButton label="Delete pillar" onClick={() => mutate((d) => void d.about.pillars.splice(i, 1))} />
            </div>
          )}
        />
        {c.about.pillars.length < 6 && (
          <button
            type="button"
            className="pill pill-line h-10 self-start px-4 text-[14px]"
            onClick={() => mutate((d) => void d.about.pillars.push({ title: "", body: "", placeholder: false, _key: newKey() } as never))}
          >
            + Add pillar
          </button>
        )}
      </Card>
    </Panel>
  )
}

/* ---------------- Projects ---------------- */

export const blankProject = (over: Partial<Project> = {}): Project =>
  ({
    slug: "",
    title: "",
    repo: "",
    description: "",
    body: "",
    category: "Full-stack",
    tech: [],
    liveUrl: "",
    thumbnail: "",
    gallery: [],
    featured: false,
    hidden: false,
    ...over,
    _key: newKey(),
  }) as Project

export function ProjectsPanel({
  c,
  mutate,
  selected,
  onSelect,
}: {
  c: SiteContent
  mutate: Mutate
  selected: number
  onSelect: (i: number) => void
}) {
  const confirm = useConfirm()
  const i = Math.min(selected, c.projects.length - 1)
  const p = c.projects[i]
  const set = (fn: (p: Project) => void) => mutate((d) => fn(d.projects[i]))

  return (
    <Panel
      title="Projects"
      description="Drag to reorder. Featured projects lead the carousel and the showcase. Empty fields fall back to GitHub."
      actions={
        <button
          type="button"
          className="pill pill-solid h-11"
          onClick={() => {
            mutate((d) => void d.projects.push(blankProject({ title: "New project", slug: `new-project-${d.projects.length + 1}` })))
            onSelect(c.projects.length)
          }}
        >
          + New project
        </button>
      }
    >
      <div className="flex flex-wrap gap-6">
        <div className="min-w-0 flex-[1_1_280px]">
          <SortableList
            label="Projects order"
            items={c.projects}
            getId={keyOf}
            onChange={(next) => {
              const key = p ? keyOf(p, i) : ""
              mutate((d) => void (d.projects = next))
              onSelect(Math.max(0, next.findIndex((n, j) => keyOf(n, j) === key)))
            }}
            render={(proj, j) => (
              <button
                type="button"
                onClick={() => onSelect(j)}
                aria-current={j === i ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left ${
                  j === i ? "border-paper bg-lift" : proj.hidden ? "border-dashed border-edge text-dust" : "border-rule"
                }`}
              >
                <span className="flex-1 truncate font-medium">{proj.title || "Untitled"}</span>
                {proj.featured && <span className="font-mono text-[11px]">★</span>}
                {proj.hidden && <span className="font-mono text-[11px] text-dust">hidden</span>}
              </button>
            )}
          />
        </div>

        {p ? (
          <Card className="flex min-w-0 flex-[2_1_480px] flex-col gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Title"
                value={p.title}
                path={`projects.${i}.title`}
                onChange={(v) =>
                  set((x) => {
                    // Keep the address in step with the title until it is edited by hand.
                    if (!x.slug || x.slug === slugify(x.title)) x.slug = slugify(v)
                    x.title = v
                  })
                }
              />
              <TextField label="Address (/work/…)" value={p.slug} path={`projects.${i}.slug`} onChange={(v) => set((x) => void (x.slug = v))} hint="Lowercase, numbers and dashes." />
              <Select
                label="Category"
                value={p.category}
                onChange={(v) => set((x) => void (x.category = v))}
                options={c.categories.map((cat) => ({ value: cat, label: cat }))}
              />
              <TextField label="GitHub repository" value={p.repo} path={`projects.${i}.repo`} placeholder="Osayeidzaber/name" onChange={(v) => set((x) => void (x.repo = v))} />
              <TextField label="Live URL" type="url" value={p.liveUrl} path={`projects.${i}.liveUrl`} placeholder="https://" onChange={(v) => set((x) => void (x.liveUrl = v))} />
              <TagInput label="Technologies" value={p.tech} path={`projects.${i}.tech`} onChange={(v) => set((x) => void (x.tech = v))} />
            </div>
            <TextArea label="Short description" rows={2} value={p.description} path={`projects.${i}.description`} hint="Leave empty to use the GitHub description." onChange={(v) => set((x) => void (x.description = v))} />
            <TextArea label="Case study text" rows={6} value={p.body} path={`projects.${i}.body`} hint="Leave empty to use an excerpt of the repository README." onChange={(v) => set((x) => void (x.body = v))} />
            <FileField label="Thumbnail" value={p.thumbnail} path={`projects.${i}.thumbnail`} hint="Leave empty to use the live site's preview image, then GitHub's card." onChange={(v) => set((x) => void (x.thumbnail = v))} />

            <div className="flex flex-col gap-3">
              <h3 className="text-[15px] font-semibold">Gallery</h3>
              {p.gallery.map((g, gi) => (
                <div key={gi} className="grid gap-3 rounded-[12px] border border-rule p-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
                  <FileField label={`Image ${gi + 1}`} value={g.src} path={`projects.${i}.gallery.${gi}.src`} onChange={(v) => set((x) => void (x.gallery[gi].src = v))} />
                  <TextField label="Alt text" value={g.alt} path={`projects.${i}.gallery.${gi}.alt`} onChange={(v) => set((x) => void (x.gallery[gi].alt = v))} />
                  <RemoveButton label={`Delete image ${gi + 1}`} onClick={() => set((x) => void x.gallery.splice(gi, 1))} />
                </div>
              ))}
              <button type="button" className="pill pill-line h-10 self-start px-4 text-[14px]" onClick={() => set((x) => void x.gallery.push({ src: "", alt: "" }))}>
                + Add image
              </button>
            </div>

            <div className="flex flex-wrap gap-6">
              <Toggle label="Featured" checked={p.featured} onChange={(v) => set((x) => void (x.featured = v))} />
              <Toggle label="Hidden from the site" checked={p.hidden} onChange={(v) => set((x) => void (x.hidden = v))} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
              <a href={`/work/${p.slug}`} target="_blank" rel="noreferrer" className="text-[14px] text-mist underline">
                Open live page
              </a>
              <button
                type="button"
                className="pill pill-line h-11"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Delete “${p.title || "this project"}”?`,
                    body: "It disappears from the site when you publish. Git keeps the old version, so it can be restored.",
                    confirm: "Delete project",
                  })
                  if (ok) {
                    mutate((d) => void d.projects.splice(i, 1))
                    onSelect(Math.max(0, i - 1))
                  }
                }}
              >
                Delete project…
              </button>
            </div>
          </Card>
        ) : (
          <Card className="flex-[2_1_480px] text-dust">No projects yet. Import one from the overview or add a new one.</Card>
        )}
      </div>
    </Panel>
  )
}

/* ---------------- Skills ---------------- */

export function SkillsPanel({ c, mutate }: { c: SiteContent; mutate: Mutate }) {
  const confirm = useConfirm()
  return (
    <Panel
      title="Skills"
      description="Only list what you actually use. Icons are Simple Icons slugs (e.g. nextdotjs, supabase) — leave empty for a monogram."
      actions={
        <button
          type="button"
          className="pill pill-solid h-11"
          onClick={() => mutate((d) => void d.skills.push({ category: "New category", items: [], _key: newKey() } as never))}
        >
          + Category
        </button>
      }
    >
      <SortableList
        label="Skill categories"
        items={c.skills}
        getId={keyOf}
        onChange={(next) => mutate((d) => void (d.skills = next))}
        render={(g, gi) => (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1">
                <TextField label="Category" value={g.category} path={`skills.${gi}.category`} onChange={(v) => mutate((d) => void (d.skills[gi].category = v))} />
              </div>
              <RemoveButton
                label={`Delete ${g.category}`}
                onClick={async () => {
                  if (await confirm({ title: `Delete the ${g.category} category and its ${g.items.length} skills?`, confirm: "Delete" }))
                    mutate((d) => void d.skills.splice(gi, 1))
                }}
              />
            </div>
            <SortableList
              label={`${g.category} skills`}
              items={g.items}
              getId={keyOf}
              onChange={(next) => mutate((d) => void (d.skills[gi].items = next))}
              render={(s, si) => (
                <div className="grid gap-3 rounded-[12px] border border-rule p-3 sm:grid-cols-[1.2fr_1.4fr_1fr_auto] sm:items-end">
                  <TextField label="Name" value={s.name} path={`skills.${gi}.items.${si}.name`} onChange={(v) => mutate((d) => void (d.skills[gi].items[si].name = v))} />
                  <TextField label="Note" value={s.note} path={`skills.${gi}.items.${si}.note`} onChange={(v) => mutate((d) => void (d.skills[gi].items[si].note = v))} />
                  <TextField label="Icon slug" value={s.icon} path={`skills.${gi}.items.${si}.icon`} onChange={(v) => mutate((d) => void (d.skills[gi].items[si].icon = v.toLowerCase()))} />
                  <RemoveButton label={`Delete ${s.name}`} onClick={() => mutate((d) => void d.skills[gi].items.splice(si, 1))} />
                </div>
              )}
            />
            <button
              type="button"
              className="pill pill-line h-10 self-start px-4 text-[14px]"
              onClick={() => mutate((d) => void d.skills[gi].items.push({ name: "", note: "", icon: "", _key: newKey() } as never))}
            >
              + Skill
            </button>
          </Card>
        )}
      />
      <Card>
        <TagInput label="Interests (the italic marquee)" value={c.interests} path="interests" onChange={(v) => mutate((d) => void (d.interests = v))} />
      </Card>
    </Panel>
  )
}

/* ---------------- Experience ---------------- */

export function ExperiencePanel({ c, mutate }: { c: SiteContent; mutate: Mutate }) {
  const confirm = useConfirm()
  const blank = (): Experience =>
    ({ id: newKey().slice(0, 12), title: "", org: "", role: "", start: "", end: "", description: "", link: "", placeholder: false, _key: newKey() }) as Experience
  return (
    <Panel
      title="Experience"
      description="Shown newest first on the site. Leave “End” empty for ongoing work. Mark an entry as a placeholder to keep it out of the public site."
      actions={
        <button type="button" className="pill pill-solid h-11" onClick={() => mutate((d) => void d.experience.unshift(blank()))}>
          + Entry
        </button>
      }
    >
      <SortableList
        label="Experience entries"
        items={c.experience}
        getId={keyOf}
        onChange={(next) => mutate((d) => void (d.experience = next))}
        render={(e, i) => (
          <Card className="grid gap-4 md:grid-cols-2">
            <TextField label="Title / project" value={e.title} path={`experience.${i}.title`} onChange={(v) => mutate((d) => void (d.experience[i].title = v))} />
            <TextField label="Organisation" value={e.org} path={`experience.${i}.org`} onChange={(v) => mutate((d) => void (d.experience[i].org = v))} />
            <TextField label="Your position" value={e.role} path={`experience.${i}.role`} placeholder="e.g. Lead developer" onChange={(v) => mutate((d) => void (d.experience[i].role = v))} />
            <TextField label="Link" type="url" value={e.link} path={`experience.${i}.link`} onChange={(v) => mutate((d) => void (d.experience[i].link = v))} />
            <TextField label="Start" type="month" value={e.start} path={`experience.${i}.start`} onChange={(v) => mutate((d) => void (d.experience[i].start = v))} />
            <TextField label="End" type="month" value={e.end} path={`experience.${i}.end`} onChange={(v) => mutate((d) => void (d.experience[i].end = v))} />
            <div className="md:col-span-2">
              <TextArea label="Description" rows={2} value={e.description} path={`experience.${i}.description`} onChange={(v) => mutate((d) => void (d.experience[i].description = v))} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <Toggle label="Placeholder (hidden on the site)" checked={e.placeholder} onChange={(v) => mutate((d) => void (d.experience[i].placeholder = v))} />
              <RemoveButton
                label={`Delete ${e.title}`}
                onClick={async () => {
                  if (await confirm({ title: `Delete “${e.title || "this entry"}”?`, confirm: "Delete" })) mutate((d) => void d.experience.splice(i, 1))
                }}
              />
            </div>
          </Card>
        )}
      />
    </Panel>
  )
}

/* ---------------- Achievements ---------------- */

export function AchievementsPanel({ c, mutate }: { c: SiteContent; mutate: Mutate }) {
  const confirm = useConfirm()
  const blank = (): Achievement =>
    ({ id: newKey().slice(0, 12), kind: "certificate", title: "", issuer: "", date: "", url: "", image: "", placeholder: false, _key: newKey() }) as Achievement
  const real = c.achievements.filter((a) => !a.placeholder).length
  return (
    <Panel
      title="Achievements"
      description={
        real
          ? "Certificates, awards, recognitions, events and milestones."
          : "Nothing real is listed yet, so the Recognition chapter is hidden on the site. Add an item and turn off “placeholder”."
      }
      actions={
        <button type="button" className="pill pill-solid h-11" onClick={() => mutate((d) => void d.achievements.unshift(blank()))}>
          + Achievement
        </button>
      }
    >
      <SortableList
        label="Achievements"
        items={c.achievements}
        getId={keyOf}
        onChange={(next) => mutate((d) => void (d.achievements = next))}
        render={(a, i) => (
          <Card className="grid gap-4 md:grid-cols-2">
            <Select
              label="Type"
              value={a.kind}
              onChange={(v) => mutate((d) => void (d.achievements[i].kind = v as Achievement["kind"]))}
              options={[
                { value: "certificate", label: "Certificate" },
                { value: "award", label: "Award" },
                { value: "recognition", label: "Leadership recognition" },
                { value: "event", label: "Event" },
                { value: "milestone", label: "Milestone" },
              ]}
            />
            <TextField label="Title" value={a.title} path={`achievements.${i}.title`} onChange={(v) => mutate((d) => void (d.achievements[i].title = v))} />
            <TextField label="Issued by" value={a.issuer} path={`achievements.${i}.issuer`} onChange={(v) => mutate((d) => void (d.achievements[i].issuer = v))} />
            <TextField label="Date" type="month" value={a.date} path={`achievements.${i}.date`} onChange={(v) => mutate((d) => void (d.achievements[i].date = v))} />
            <TextField label="Verification link" type="url" value={a.url} path={`achievements.${i}.url`} onChange={(v) => mutate((d) => void (d.achievements[i].url = v))} />
            <FileField label="Certificate image" value={a.image} path={`achievements.${i}.image`} onChange={(v) => mutate((d) => void (d.achievements[i].image = v))} />
            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <Toggle label="Placeholder (hidden on the site)" checked={a.placeholder} onChange={(v) => mutate((d) => void (d.achievements[i].placeholder = v))} />
              <RemoveButton
                label={`Delete ${a.title}`}
                onClick={async () => {
                  if (await confirm({ title: `Delete “${a.title || "this item"}”?`, confirm: "Delete" })) mutate((d) => void d.achievements.splice(i, 1))
                }}
              />
            </div>
          </Card>
        )}
      />
    </Panel>
  )
}

/* ---------------- Settings ---------------- */

const SECTION_LABEL: Record<(typeof sectionKeys)[number], string> = {
  about: "01 About",
  work: "02 Work",
  showcase: "02b Showcase (laptop)",
  toolkit: "03 Toolkit",
  ledger: "04 GitHub ledger",
  experience: "05 Experience",
  achievements: "06 Recognition",
  playground: "07 Playground",
  contact: "08 Contact",
}

export function SettingsPanel({ c, mutate, repos }: { c: SiteContent; mutate: Mutate; repos: EditorState["repos"] }) {
  return (
    <Panel title="Site settings" description="Sections, search engines, contact copy, categories and hidden repositories.">
      <Card className="flex flex-col gap-2">
        <h3 className="pb-2 text-[18px] font-semibold">Sections</h3>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {sectionKeys.map((k) => (
            <Toggle key={k} label={SECTION_LABEL[k]} checked={c.sections[k]} onChange={(v) => mutate((d) => void (d.sections[k] = v))} />
          ))}
        </div>
      </Card>
      <Card className="grid gap-5">
        <h3 className="text-[18px] font-semibold">Search & sharing</h3>
        <TextField label="Page title" value={c.seo.title} path="seo.title" hint={`${c.seo.title.length}/70`} onChange={(v) => mutate((d) => void (d.seo.title = v))} />
        <TextArea label="Description" rows={2} value={c.seo.description} path="seo.description" hint={`${c.seo.description.length}/200`} onChange={(v) => mutate((d) => void (d.seo.description = v))} />
        <TagInput label="Keywords" value={c.seo.keywords} path="seo.keywords" onChange={(v) => mutate((d) => void (d.seo.keywords = v))} />
      </Card>
      <Card className="grid gap-5 md:grid-cols-2">
        <h3 className="text-[18px] font-semibold md:col-span-2">Contact section</h3>
        <TextField label="Heading" value={c.contact.heading} path="contact.heading" onChange={(v) => mutate((d) => void (d.contact.heading = v))} hint="The last word is set in italics." />
        <TextField label="Note" value={c.contact.note} path="contact.note" onChange={(v) => mutate((d) => void (d.contact.note = v))} />
      </Card>
      <Card className="grid gap-5">
        <TagInput label="Project categories" value={c.categories} path="categories" onChange={(v) => mutate((d) => void (d.categories = v))} hint="Used by the Work filter. Projects in a removed category keep their label." />
        <div className="flex flex-col gap-2">
          <span className="text-[14px] text-mist">Hidden repositories (never shown automatically)</span>
          <div className="flex flex-wrap gap-2">
            {repos
              .filter((r) => !r.fork)
              .map((r) => {
                const hidden = c.hiddenRepos.includes(r.name)
                return (
                  <button
                    key={r.name}
                    type="button"
                    aria-pressed={hidden}
                    onClick={() =>
                      mutate((d) => {
                        d.hiddenRepos = hidden ? d.hiddenRepos.filter((h) => h !== r.name) : [...d.hiddenRepos, r.name]
                      })
                    }
                    className={`h-9 rounded-full border px-3 font-mono text-[12px] ${hidden ? "border-paper bg-paper text-ink" : "border-edge text-mist"}`}
                  >
                    {hidden ? "hidden · " : ""}
                    {r.name}
                  </button>
                )
              })}
          </div>
        </div>
      </Card>
    </Panel>
  )
}

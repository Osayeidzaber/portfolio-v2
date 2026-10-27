import { z } from "zod"

/*
 * The single content model for the site. `content/site.json` (published) and
 * `content/draft.json` (admin draft) both follow it. Items flagged `placeholder`
 * are shown in the admin only and never rendered on the public site.
 */

const url = z.union([z.url({ protocol: /^https?$/ }), z.literal("")])
const path = z
  .string()
  .regex(/^(|\/media\/[A-Za-z0-9._/-]+|https:\/\/[^\s]+)$/, "Must be an uploaded file or an https URL")

export const socialSchema = z.object({
  label: z.string().min(1).max(40),
  url: z.url({ protocol: /^(https?|mailto)$/ }),
})

export const profileSchema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  roles: z.array(z.string().min(1).max(40)).min(1).max(8),
  intro: z.string().min(1).max(320),
  location: z.string().max(80),
  email: z.union([z.email(), z.literal("")]),
  availability: z.object({
    status: z.enum(["available", "limited", "unavailable"]),
    label: z.string().max(80),
  }),
  avatar: path,
  resume: path,
  socials: z.array(socialSchema).max(10),
})

export const aboutSchema = z.object({
  heading: z.string().min(1).max(120),
  paragraphs: z.array(z.string().min(1).max(900)).min(1).max(6),
  quote: z.string().max(240),
  pillars: z
    .array(
      z.object({
        title: z.string().min(1).max(40),
        body: z.string().min(1).max(240),
        placeholder: z.boolean().default(false),
      }),
    )
    .max(6),
})

export const projectSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only"),
  title: z.string().min(1).max(80),
  /** `owner/name` on GitHub, optional for non-GitHub projects. */
  repo: z.union([z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, "Use owner/name"), z.literal("")]),
  description: z.string().max(400),
  body: z.string().max(4000),
  category: z.string().min(1).max(40),
  tech: z.array(z.string().min(1).max(40)).max(16),
  liveUrl: url,
  thumbnail: path,
  gallery: z.array(z.object({ src: path, alt: z.string().max(160) })).max(12),
  featured: z.boolean(),
  hidden: z.boolean(),
})

export const skillGroupSchema = z.object({
  category: z.string().min(1).max(40),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        note: z.string().max(60),
        /** simple-icons slug, e.g. "nextdotjs"; empty for a monogram. */
        icon: z.string().max(40).regex(/^[a-z0-9]*$/),
      }),
    )
    .max(24),
})

export const experienceSchema = z.object({
  id: z.string().min(1).max(60),
  title: z.string().min(1).max(100),
  org: z.string().max(100),
  role: z.string().max(100),
  start: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM"),
  end: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("")]),
  description: z.string().max(600),
  link: url,
  placeholder: z.boolean().default(false),
})

export const achievementSchema = z.object({
  id: z.string().min(1).max(60),
  kind: z.enum(["award", "certificate", "recognition", "event", "milestone"]),
  title: z.string().min(1).max(140),
  issuer: z.string().max(100),
  date: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("")]),
  url: url,
  image: path,
  placeholder: z.boolean().default(false),
})

export const sectionKeys = [
  "about",
  "work",
  "showcase",
  "toolkit",
  "ledger",
  "experience",
  "achievements",
  "playground",
  "contact",
] as const

export const siteContentSchema = z.object({
  version: z.literal(1),
  profile: profileSchema,
  about: aboutSchema,
  projects: z.array(projectSchema).max(60),
  /** Repository names (without owner) never shown, even if they rank well. */
  hiddenRepos: z.array(z.string().max(100)).max(200),
  categories: z.array(z.string().min(1).max(40)).min(1).max(12),
  skills: z.array(skillGroupSchema).max(10),
  interests: z.array(z.string().min(1).max(40)).max(30),
  experience: z.array(experienceSchema).max(40),
  achievements: z.array(achievementSchema).max(60),
  sections: z.object(Object.fromEntries(sectionKeys.map((k) => [k, z.boolean()])) as Record<
    (typeof sectionKeys)[number],
    z.ZodBoolean
  >),
  contact: z.object({
    heading: z.string().min(1).max(60),
    note: z.string().max(200),
  }),
  seo: z.object({
    title: z.string().min(1).max(70),
    description: z.string().min(1).max(200),
    keywords: z.array(z.string().max(40)).max(20),
  }),
})

export type SiteContent = z.infer<typeof siteContentSchema>
export type Project = z.infer<typeof projectSchema>
export type Experience = z.infer<typeof experienceSchema>
export type Achievement = z.infer<typeof achievementSchema>
export type SkillGroup = z.infer<typeof skillGroupSchema>
export type SectionKey = (typeof sectionKeys)[number]

export function parseContent(input: unknown) {
  return siteContentSchema.safeParse(input)
}

/** Plain-language version of a validation issue, for people rather than developers. */
export function friendlyIssue(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case "too_small":
      return issue.minimum === 1 ? "This can't be empty" : `Add at least ${issue.minimum}`
    case "too_big":
      return issue.origin === "string" ? `Keep it under ${issue.maximum} characters` : `At most ${issue.maximum} items`
    case "invalid_format":
      return issue.format === "email"
        ? "That doesn't look like an email address"
        : issue.format === "url"
          ? "Use a full link starting with https://"
          : issue.message
    case "invalid_union":
      return "Use a full link starting with https://, or leave it empty"
    default:
      return issue.message
  }
}

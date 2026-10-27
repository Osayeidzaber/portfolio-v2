export type CommandPlatform = "lp" | "lpb" | "lpv"
export type CommandOptions = { platform: CommandPlatform; console: boolean; server: string; world: string }
const name = (value: string, label: string) => {
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/.test(value)) throw new Error(`${label}: use 1–48 lowercase letters, numbers, dashes or underscores.`)
  return value
}
const quote = (value: string) => {
  if (/["\\\x00-\x1f\x7f]/.test(value)) throw new Error("Command text must be a single line without double quotes or backslashes.")
  if (value.length > 4000) throw new Error("Keep each command text value under 4,000 characters.")
  return `"${value}"`
}
const number = (value: string, label: string) => {
  if (!/^\d{1,5}$/.test(value) || Number(value) > 10000) throw new Error(`${label} must be a whole number from 0 to 10,000.`)
  return Number(value)
}
function base(options: CommandOptions) {
  if (!["lp", "lpb", "lpv"].includes(options.platform)) throw new Error("Choose a supported LuckPerms platform.")
  return `${options.console ? "" : "/"}${options.platform}`
}
function contexts(options: CommandOptions) {
  return (["server", "world"] as const).map((key) => {
    const value = options[key].trim()
    if (!value) return ""
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(value)) throw new Error(`${key} context: use letters, numbers, dots, dashes or underscores.`)
    return ` ${key}=${value}`
  }).join("")
}
function player(value: string) {
  if (!/^(?:[A-Za-z0-9_]{1,16}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(value)) throw new Error("Use a Java username (1–16 letters, numbers or underscores) or a UUID.")
  return value
}

export type RankInput = CommandOptions & { group: string; displayName: string; prefix: string; suffix: string; weight: string; priority: string; parent: string; permissions: string; create: boolean; player: string; replacePrefix: boolean }
/** Generated commands only. No request to a server and no executable script output. */
export function rankCommands(input: RankInput) {
  const group = name(input.group.trim(), "Group name"), root = base(input), context = contexts(input)
  const weight = number(input.weight, "Group weight"), priority = number(input.priority, "Prefix priority")
  const commands: string[] = []
  if (input.create) commands.push(`${root} creategroup ${group}`)
  commands.push(`${root} group ${group} setweight ${weight}`)
  if (input.displayName) commands.push(`${root} group ${group} setdisplayname ${quote(input.displayName)}${context}`)
  if (input.prefix) commands.push(`${root} group ${group} meta ${input.replacePrefix ? "setprefix" : "addprefix"} ${priority} ${quote(input.prefix)}${context}`)
  if (input.suffix) commands.push(`${root} group ${group} meta ${input.replacePrefix ? "setsuffix" : "addsuffix"} ${priority} ${quote(input.suffix)}${context}`)
  if (input.parent.trim()) {
    const parent = name(input.parent.trim(), "Parent group")
    if (parent === group) throw new Error("A rank cannot inherit itself.")
    commands.push(`${root} group ${group} parent add ${parent}${context}`)
  }
  const seen = new Set<string>()
  const permissions = input.permissions.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (permissions.length > 100) throw new Error("Use at most 100 permission nodes at a time.")
  for (const line of permissions) {
    const deny = line.startsWith("-"), node = line.replace(/^[+-]/, "")
    if (!/^[a-zA-Z0-9_.*:-]{1,150}$/.test(node)) throw new Error(`Invalid permission node: ${node.slice(0, 40)}. Use one node per line; prefix a denied node with -.`)
    if (seen.has(node)) throw new Error(`Permission ${node} appears more than once. Choose either allow or deny.`)
    seen.add(node)
    commands.push(`${root} group ${group} permission set ${node} ${!deny}${context}`)
  }
  if (input.player.trim()) commands.push(`${root} user ${player(input.player.trim())} parent add ${group}${context}`)
  commands.push(`${root} group ${group} meta info`, `${root} group ${group} info`)
  return commands.join("\n")
}

export type TrackInput = CommandOptions & { track: string; groups: string; createGroups: boolean; inherit: boolean; createTrack: boolean }
export function trackCommands(input: TrackInput) {
  const track = name(input.track.trim(), "Track name"), root = base(input), context = contexts(input)
  const groups = input.groups.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).map((item) => name(item, "Rank name"))
  if (groups.length < 2 || groups.length > 20) throw new Error("Enter 2–20 ranks, lowest first, with one per line or separated by commas.")
  if (new Set(groups).size !== groups.length) throw new Error("Each rank must appear only once in the ladder.")
  const commands: string[] = []
  if (input.createGroups) for (const group of groups) if (group !== "default") commands.push(`${root} creategroup ${group}`)
  if (input.createTrack) commands.push(`${root} createtrack ${track}`)
  groups.forEach((group, index) => {
    commands.push(`${root} track ${track} append ${group}`)
    if (input.inherit && index > 0) commands.push(`${root} group ${group} parent add ${groups[index - 1]}${context}`)
  })
  commands.push(`${root} track ${track} info`)
  return commands.join("\n")
}

export type MetaInput = CommandOptions & { kind: "group" | "user"; target: string; key: string; value: string; operation: "set" | "unset" }
export function metaCommands(input: MetaInput) {
  if (!["group", "user"].includes(input.kind) || !["set", "unset"].includes(input.operation)) throw new Error("Choose a supported target and operation.")
  const target = input.kind === "group" ? name(input.target.trim(), "Group name") : player(input.target.trim())
  if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(input.key)) throw new Error("Meta keys use letters, numbers, dots, dashes or underscores.")
  if (input.operation === "set" && !input.value.trim()) throw new Error("Enter a value for the meta key.")
  return `${base(input)} ${input.kind} ${target} meta ${input.operation} ${input.key}${input.operation === "set" ? ` ${quote(input.value)}` : ""}${contexts(input)}\n${base(input)} ${input.kind} ${target} meta info`
}

import { HomeView } from "@/components/site/home-view"
import { getContent } from "@/lib/content/read"
import { getGithubData } from "@/lib/github/data"

export default async function Home() {
  const [content, github] = await Promise.all([getContent(), getGithubData()])
  return <HomeView content={content} github={github} />
}

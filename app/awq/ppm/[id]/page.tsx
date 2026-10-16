import { SEED_PROJECTS } from "@/lib/ppm-db";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamicParams = process.env.STATIC_EXPORT !== "1";

export function generateStaticParams() {
  return SEED_PROJECTS.map(p => ({ id: p.project_id }));
}

export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}

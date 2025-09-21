import {
  Github,
  Linkedin,
  LucideIcon,
  LucideProps,
  Menu,
  Moon,
  SunMedium,
  Twitter,
} from "lucide-react"

export type Icon = LucideIcon

export const Icons = {
  sun: SunMedium,
  moon: Moon,
  menu: Menu,
  linkedin: Linkedin,
  twitter: Twitter,
  gitHub: Github,
  logo: (props: LucideProps) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 28 32 10l26 18" />
      <path d="M14 26v24a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V26" />
      <path d="M24 54V38h16v16" />
      <path d="M6 46h12" />
      <path d="M46 46h12" />
    </svg>
  ),
}

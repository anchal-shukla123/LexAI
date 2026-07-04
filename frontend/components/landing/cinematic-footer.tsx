import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, Mail } from "lucide-react";

import { Reveal } from "@/components/landing/scroll-reveal";

const footerNav = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign up" }
];

export function CinematicFooter() {
  return (
    <footer className="landing-footer relative z-10">
      <div className="landing-footer-word" aria-hidden="true">
        LEXAI
      </div>
      <Reveal className="container">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Image
              src="/brand/lexai-logo-horizontal.png"
              alt="LexAI"
              width={140}
              height={46}
              className="h-auto w-[140px] object-contain"
            />
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#A2AAA5]">
              Contract review MVP by Anchal Shukla.
            </p>
          </div>

          <div>
            <h3>Navigation</h3>
            <div className="mt-4 space-y-3">
              {footerNav.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3>Contact</h3>
            <p className="mt-4 flex items-center gap-2 text-sm leading-6 text-[#A2AAA5]">
              <Mail className="h-4 w-4 text-[#A7C957]" aria-hidden="true" />
              Contact available on request.
            </p>
            <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#6F7A74]">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              LexAI provides AI-generated document intelligence for demonstration and does not replace professional legal advice.
            </p>
          </div>
        </div>
      </Reveal>
    </footer>
  );
}

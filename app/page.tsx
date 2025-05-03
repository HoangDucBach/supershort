import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import { ShortLinkInput } from "./_components/ShortLinkInput";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <h1 className="text-6xl text-primary font-bold">
        SuperShort
      </h1>
      <h1 className="text-2xl font-semibold">
        Shorten, Super Fast, Super Memorable!
      </h1>
      <ShortLinkInput />
    </section>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CraftHQ 3D art",
  description: "The Blender artwork behind the CraftHQ sign-in card, shown without the card.",
};

// The full scene rendered in one pass (design/renders/peek_v001/peek_full_v001.png), so overlaps
// that the card normally hides are correct here. 764 × 838 CSS px, stored at 2×.
export default function ArtPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-5 py-10">
      <div className="relative aspect-[764/838] w-[min(764px,100%,calc((100svh-150px)*0.9117))]">
        <Image
          src="/images/3d/art-full.webp"
          alt="3D artwork rendered in Blender: builder and checker robots, glossy prints, an open spec book, jelly tubes, chrome “Craft” lettering and wax coins arranged in a ring"
          fill
          sizes="764px"
          loading="eager"
          unoptimized
          className="object-contain [filter:drop-shadow(0_14px_22px_rgb(40_30_90/0.16))]"
        />
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Rendered in Blender · the objects behind the{" "}
        <Link href="/login" className="font-semibold text-foreground underline-offset-2 hover:underline">
          sign-in card
        </Link>
      </p>
    </main>
  );
}

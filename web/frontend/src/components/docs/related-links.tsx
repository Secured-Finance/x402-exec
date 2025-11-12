import type { ComponentProps } from "react";

export type RelatedLink = {
  title: string;
  href: string;
  description?: string;
};

type Props = {
  items: RelatedLink[];
  className?: string;
} & ComponentProps<"div">;

/**
 * Minimal card grid for external related documentation links.
 */
export function RelatedLinks({ items, className, ...rest }: Props) {
  return (
    <div
      className={["grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="group rounded-lg border border-border/70 bg-muted/40 p-4 transition-colors hover:bg-muted/60 no-underline hover:no-underline"
        >
          <div className="mb-1 font-medium text-foreground">
            {item.title}
          </div>
          {item.description ? (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          ) : null}
        </a>
      ))}
    </div>
  );
}

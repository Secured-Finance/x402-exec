import { DocsMobileNav, DocsSidebar } from "@/components/docs/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockFiles,
  CodeBlockHeader,
  CodeBlockItem,
} from "@/components/ui/shadcn-io/code-block";
import { getDefaultDocSlug, getDocBySlug } from "@/lib/docs";
import { MDXProvider } from "@mdx-js/react";
import type { ComponentPropsWithoutRef } from "react";
import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";

// Custom MDX element styles (no Tailwind Typography `prose`)
const mdxComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="text-2xl font-semibold tracking-tight text-foreground"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className="text-xl font-semibold tracking-tight text-foreground"
      {...props}
    />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="text-base leading-relaxed text-foreground" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a
      className="font-medium text-primary underline-offset-4 hover:underline"
      target={props.href?.startsWith("http") ? "_blank" : undefined}
      rel={props.href?.startsWith("http") ? "noreferrer" : undefined}
      {...props}
    />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => <ul {...props} />,
  ol: (props: ComponentPropsWithoutRef<"ol">) => <ol {...props} />,
  li: (props: ComponentPropsWithoutRef<"li">) => <li {...props} />,
  pre: (props: ComponentPropsWithoutRef<"pre">) => {
    // Render fenced code blocks via our CodeBlock component; fallback to styled <pre>
    const childrenArray = React.Children.toArray(props.children) as any[];
    const firstChild = (childrenArray[0] ?? {}) as any;
    const firstChildProps = firstChild?.props ?? {};

    console.log("code block detected", firstChild);

    // Extract language from either the <pre> itself or a nested child
    const preClass = (props.className as string) || "";
    const preDataLang =
      (props as any)["data-language"] || (props as any)["dataLang"];
    const childClass = firstChildProps.className || "";
    const childDataLang =
      firstChildProps["data-language"] || firstChildProps["dataLang"];

    const matchLang = (v: string) =>
      (v.match(/language-([^\s]+)/)?.[1] || "").trim();
    const langRaw = (
      (typeof preDataLang === "string" && preDataLang) ||
      matchLang(preClass) ||
      (typeof childDataLang === "string" && childDataLang) ||
      matchLang(childClass) ||
      ""
    ).trim();

    // If language is missing, default to plaintext so we still render a consistent block UI

    // Extract optional meta from child (rehype often sets metastring there)
    const meta: string = firstChildProps.metastring || "";
    const toText = (n: any): string => {
      if (n == null) return "";
      if (typeof n === "string" || typeof n === "number") return String(n);
      if (Array.isArray(n)) return n.map(toText).join("");
      if (typeof n === "object" && "props" in n)
        return toText(n.props.children);
      return "";
    };
    // Flatten only the nested code node to plain text (more reliable across MDX transforms)
    const rawCode: string = toText(firstChildProps.children ?? "");

    const mapExtToLang = (ext: string) => {
      switch (ext) {
        case "ts":
          return "typescript";
        case "tsx":
          return "tsx";
        case "js":
          return "javascript";
        case "jsx":
          return "jsx";
        case "json":
          return "json";
        case "md":
          return "markdown";
        case "mdx":
          return "mdx";
        case "yml":
        case "yaml":
          return "yaml";
        case "sh":
        case "bash":
        case "zsh":
          return "bash";
        case "toml":
          return "toml";
        case "sol":
          return "solidity";
        case "rs":
          return "rust";
        case "go":
          return "go";
        case "py":
          return "python";
        case "rb":
          return "ruby";
        case "kt":
          return "kotlin";
        case "swift":
          return "swift";
        case "java":
          return "java";
        case "c":
          return "c";
        case "cc":
        case "cpp":
        case "cxx":
        case "hpp":
          return "cpp";
        case "css":
          return "css";
        case "scss":
          return "scss";
        case "sass":
          return "sass";
        case "html":
          return "html";
        case "vue":
          return "vue";
        case "svelte":
          return "svelte";
        default:
          return "plaintext";
      }
    };
    const normalizeLangOrFile = (value: string) => {
      const m = (value || "").toLowerCase();
      // If looks like a filename, use its extension
      if (/[^\s]+\.[a-z0-9]+$/.test(m)) {
        const ext = m.split(".").pop()!;
        return { language: mapExtToLang(ext), filenameGuess: value } as const;
      }
      // Otherwise treat as a language token
      switch (m) {
        case "ts":
          return { language: "typescript" } as const;
        case "tsx":
          return { language: "tsx" } as const;
        case "js":
          return { language: "javascript" } as const;
        case "jsx":
          return { language: "jsx" } as const;
        case "sh":
        case "shell":
        case "bash":
          return { language: "bash" } as const;
        case "yml":
          return { language: "yaml" } as const;
        default:
          return { language: m || "plaintext" } as const;
      }
    };

    const { language: detectedLanguage, filenameGuess } = normalizeLangOrFile(
      langRaw || "",
    );
    const language = detectedLanguage;

    // Optional meta parsing: filename=..., lineNumbers=false
    const filenameMeta = (
      meta.match(/(?:filename|file|name)=([^\s]+)/)?.[1] || ""
    ).trim();
    const filename = filenameMeta || filenameGuess || "";
    const lineNumbersDisabled =
      /(?:lineNumbers|line-numbers|numbers)\s*=\s*(false|0|off)/i.test(meta);
    // Heuristic: no line numbers for shell-like one-liners by default
    const defaultLineNumbers = !["bash", "sh", "shell"].includes(language);
    const lineNumbers = lineNumbersDisabled ? false : defaultLineNumbers;

    const code = rawCode.replace(/\n$/, ""); // trim single trailing newline common in MDX

    return (
      <CodeBlock
        data={[
          {
            language,
            filename: filename || "",
            code,
          },
        ]}
        value={language}
        className="w-full h-auto overflow-visible bg-muted/40"
      >
        <CodeBlockHeader>
          <CodeBlockFiles>
            {(item) => (
              <CodeBlockFilename key={item.language} value={item.language}>
                {filename || language}
              </CodeBlockFilename>
            )}
          </CodeBlockFiles>
          <div className="ml-auto">
            <CodeBlockCopyButton />
          </div>
        </CodeBlockHeader>
        <CodeBlockBody>
          {(item) => (
            <CodeBlockItem
              key={item.language}
              value={item.language}
              lineNumbers={lineNumbers}
            >
              <CodeBlockContent language={language}>{code}</CodeBlockContent>
            </CodeBlockItem>
          )}
        </CodeBlockBody>
      </CodeBlock>
    );
  },
  code: (props: ComponentPropsWithoutRef<"code">) => {
    const isBlock =
      typeof props.className === "string" &&
      props.className.includes("language-");
    if (isBlock) {
      // Let the <pre> renderer handle code blocks; keep raw
      return <code {...props} />;
    }
    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground"
        {...props}
      />
    );
  },
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 overflow-x-auto">
      <table
        className="w-full border-collapse text-sm text-foreground"
        {...props}
      />
    </div>
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="border-l-2 border-primary/40 bg-muted/40 px-4 py-2 text-muted-foreground"
      {...props}
    />
  ),
  hr: () => <Separator className="my-8" />,
};

export default function DocsPage() {
  const { slug } = useParams();
  const doc = getDocBySlug(slug);

  useEffect(() => {
    if (doc?.frontmatter.title) {
      document.title = `x402x • ${doc.frontmatter.title}`;
    }
  }, [doc?.frontmatter.title]);

  if (!doc) {
    return <DocNotFound />;
  }

  const Article = doc.Component;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 lg:flex-row lg:gap-12">
      <DocsSidebar activeSlug={doc.slug} />
      <section className="flex-1 max-w-3xl">
        <div className="space-y-6">
          <div className="mx-auto w-full space-y-6">
            <DocsMobileNav activeSlug={doc.slug} />
            <header className="space-y-2">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {doc.frontmatter.title}
                </h1>
                {doc.frontmatter.description ? (
                  <p className="text-lg text-muted-foreground">
                    {doc.frontmatter.description}
                  </p>
                ) : null}
              </div>
            </header>
            <Separator />
          </div>
          <div className="docs-content w-full mx-auto space-y-6">
            <MDXProvider components={mdxComponents}>
              <Article /* @ts-ignore mdx components prop */ components={mdxComponents as any} />
            </MDXProvider>
          </div>
        </div>
      </section>
    </div>
  );
}

function DocNotFound() {
  const defaultSlug = getDefaultDocSlug();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">Doc not found</h1>
      <p className="mt-3 text-muted-foreground">
        The page you requested does not exist. Please choose another guide from
        the sidebar.
      </p>
      {defaultSlug ? (
        <Link
          to="/docs"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Back to docs
        </Link>
      ) : null}
    </div>
  );
}

"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useState } from "react";

/**
 * Admin-only WYSIWYG. Lives behind /admin, so its bundle never reaches the
 * public pages — those stay server-rendered with no client JS.
 *
 * The editor writes into a hidden input so the surrounding plain <form>
 * submits normally through the existing server action, with no change to
 * how those actions are called.
 */
export function RichTextEditor({
  name,
  defaultValue,
  lang,
}: {
  name: string;
  defaultValue: string;
  lang?: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Headings below h2 only: the page's own <h1> is rendered by the
        // template, so body content must not introduce a second one.
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: defaultValue,
    // Required in Next.js App Router: rendering the editor during SSR
    // causes a hydration mismatch.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-admin min-h-[12rem] px-3 py-2 focus:outline-none",
        ...(lang ? { lang } : {}),
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  return (
    <div className="border border-[#c8a24a]/40 rounded">
      <input type="hidden" name={name} value={html} />
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 border-b border-[#c8a24a]/30 p-1.5">
      <Btn editor={editor} label="B" title="Bold" active="bold" onClick={(e) => e.chain().focus().toggleBold().run()} />
      <Btn editor={editor} label="I" title="Italic" active="italic" onClick={(e) => e.chain().focus().toggleItalic().run()} />
      <Sep />
      <Btn editor={editor} label="H2" title="Heading 2" active="heading" activeAttrs={{ level: 2 }} onClick={(e) => e.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Btn editor={editor} label="H3" title="Heading 3" active="heading" activeAttrs={{ level: 3 }} onClick={(e) => e.chain().focus().toggleHeading({ level: 3 }).run()} />
      <Sep />
      <Btn editor={editor} label="• List" title="Bullet list" active="bulletList" onClick={(e) => e.chain().focus().toggleBulletList().run()} />
      <Btn editor={editor} label="1. List" title="Numbered list" active="orderedList" onClick={(e) => e.chain().focus().toggleOrderedList().run()} />
      <Btn editor={editor} label="Quote" title="Blockquote" active="blockquote" onClick={(e) => e.chain().focus().toggleBlockquote().run()} />
      <Sep />
      <LinkButton editor={editor} />
      <Btn editor={editor} label="Clear" title="Remove formatting" onClick={(e) => e.chain().focus().unsetAllMarks().clearNodes().run()} />
    </div>
  );
}

function Sep() {
  return <span aria-hidden="true" className="w-px bg-[#c8a24a]/30 mx-1" />;
}

function Btn({
  editor,
  label,
  title,
  active,
  activeAttrs,
  onClick,
}: {
  editor: Editor;
  label: string;
  title: string;
  active?: string;
  activeAttrs?: Record<string, unknown>;
  onClick: (editor: Editor) => void;
}) {
  const isActive = active ? editor.isActive(active, activeAttrs) : false;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active ? isActive : undefined}
      onClick={() => onClick(editor)}
      className={`text-xs px-2 py-1 rounded border ${
        isActive ? "bg-[#c8a24a]/20 border-[#c8a24a]" : "border-transparent hover:border-[#c8a24a]/40"
      }`}
    >
      {label}
    </button>
  );
}

function LinkButton({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove):", previous ?? "https://");

    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    // Only http(s) and mailto survive server-side sanitization anyway;
    // rejecting here too gives the editor immediate feedback.
    if (!/^(https?:|mailto:)/i.test(url)) {
      window.alert("Links must start with http://, https:// or mailto:");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <button
      type="button"
      title="Add or edit link"
      aria-label="Add or edit link"
      aria-pressed={editor.isActive("link")}
      onClick={setLink}
      className={`text-xs px-2 py-1 rounded border ${
        editor.isActive("link") ? "bg-[#c8a24a]/20 border-[#c8a24a]" : "border-transparent hover:border-[#c8a24a]/40"
      }`}
    >
      Link
    </button>
  );
}

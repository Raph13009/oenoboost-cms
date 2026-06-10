"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { sanitizeRichTextHtml } from "@/lib/richtext-html";

const richEditorShellClass =
  "w-full rounded border border-slate-200 bg-white focus-within:border-slate-300 focus-within:ring-1 focus-within:ring-slate-200";

function ToolbarButton({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-8 rounded px-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-slate-100 text-slate-900" : ""
      }`}
    >
      {children}
    </button>
  );
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
};

export function CmsRichTextEditor({
  value,
  onChange,
  placeholder = "Saisir du texte…",
  minHeightClass = "min-h-[6rem]",
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          `tiptap px-2 py-1.5 text-sm text-slate-900 leading-relaxed outline-none ` +
          minHeightClass +
          " " +
          "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 " +
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 " +
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 " +
          "[&_a]:text-slate-800 [&_a]:underline " +
          "[&_.is-editor-empty:first-child::before]:text-slate-400 [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeRichTextHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = sanitizeRichTextHtml(editor.getHTML());
    const next = sanitizeRichTextHtml(value || "");
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL du lien", previousUrl ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  return (
    <div className={richEditorShellClass}>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/70 px-2 py-1.5">
        <ToolbarButton
          title="Gras"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <span className="font-semibold">B</span>
        </ToolbarButton>
        <ToolbarButton
          title="Italique"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          title="Souligné"
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
        <ToolbarButton
          title="Liste à puces"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • Liste
        </ToolbarButton>
        <ToolbarButton
          title="Liste numérotée"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. Liste
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
        <ToolbarButton
          title="Insérer un lien"
          active={editor?.isActive("link")}
          onClick={setLink}
        >
          Lien
        </ToolbarButton>
        <ToolbarButton
          title="Retirer le lien"
          disabled={!editor?.isActive("link")}
          onClick={() => editor?.chain().focus().unsetLink().run()}
        >
          Retirer lien
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

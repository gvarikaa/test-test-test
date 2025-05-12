"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TextAlign } from './extensions/text-align';
import './rich-text-styles.css';

interface RichTextContentProps {
  content?: string;
  jsonContent?: any;
  className?: string;
}

export default function RichTextContent({
  content = '',
  jsonContent,
  className = '',
}: RichTextContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
    ],
    content: jsonContent || content,
    editable: false,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={`rich-text-content ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import RichTextToolbar from './rich-text-toolbar';
import { useState, useEffect } from 'react';
import { TextAlign } from './extensions/text-align';
import './rich-text-styles.css';

export interface RichTextEditorProps {
  content?: string;
  placeholder?: string;
  onChange?: (html: string, json: any) => void;
  minHeight?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function RichTextEditor({
  content = '',
  placeholder = 'What\'s on your mind?',
  onChange,
  minHeight = '150px',
  autoFocus = false,
  disabled = false,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        validate: href => /^https?:\/\//.test(href),
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
    ],
    content,
    editable: !disabled,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const html = editor.getHTML();
        const json = editor.getJSON();
        onChange(html, json);
      }
    },
    onFocus: () => {
      setIsFocused(true);
    },
    onBlur: () => {
      setIsFocused(false);
    },
  });

  // Update content when content prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className={`rich-text-editor w-full rounded-lg transition ${isFocused ? 'ring-2 ring-primary/50' : 'ring-1 ring-border-color'}`}>
      <RichTextToolbar editor={editor} />
      <div 
        className={`editor-content px-4 py-3 ${disabled ? 'bg-muted/20 cursor-not-allowed' : 'bg-transparent'}`}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Function to strip HTML and return just text
export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

// Function to extract hashtags from content
export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);
  return matches
    ? matches.map(tag => tag.substring(1).toLowerCase())
    : [];
}
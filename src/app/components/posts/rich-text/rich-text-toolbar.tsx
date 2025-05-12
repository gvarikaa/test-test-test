"use client";

import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Heading,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { useState } from 'react';

interface ToolbarButton {
  icon: React.ReactNode;
  title: string;
  action: () => void;
  isActive?: () => boolean;
}

interface RichTextToolbarProps {
  editor: Editor | null;
}

export default function RichTextToolbar({ editor }: RichTextToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!editor) {
    return null;
  }

  const tools: ToolbarButton[] = [
    {
      icon: <Bold size={18} />,
      title: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <Italic size={18} />,
      title: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <Strikethrough size={18} />,
      title: 'Strikethrough',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    {
      icon: <Heading size={18} />,
      title: 'Heading',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      icon: <List size={18} />,
      title: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered size={18} />,
      title: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      icon: <Quote size={18} />,
      title: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      icon: <Code size={18} />,
      title: 'Code',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      icon: <LinkIcon size={18} />,
      title: 'Link',
      action: () => {
        if (editor.isActive('link')) {
          editor.chain().focus().unsetLink().run();
        } else {
          setShowLinkInput(!showLinkInput);
        }
      },
      isActive: () => editor.isActive('link'),
    },
  ];

  const handleSetLink = () => {
    if (linkUrl) {
      // Prepend https:// if not present
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  };

  return (
    <div className="border-b border-border-color">
      <div className="flex flex-wrap items-center px-2 py-1.5 gap-0.5">
        {tools.map((tool, index) => (
          <button
            key={index}
            onClick={tool.action}
            title={tool.title}
            type="button"
            className={`p-1.5 rounded-md hover:bg-hover-bg transition ${
              tool.isActive?.() ? 'bg-muted/50 text-primary' : 'text-text-secondary'
            }`}
          >
            {tool.icon}
          </button>
        ))}

        <div className="mx-1 h-6 w-px bg-border-color" />

        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded-md hover:bg-hover-bg transition ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-muted/50 text-primary' : 'text-text-secondary'
          }`}
          title="Align left"
          type="button"
        >
          <AlignLeft size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded-md hover:bg-hover-bg transition ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-muted/50 text-primary' : 'text-text-secondary'
          }`}
          title="Align center"
          type="button"
        >
          <AlignCenter size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded-md hover:bg-hover-bg transition ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-muted/50 text-primary' : 'text-text-secondary'
          }`}
          title="Align right"
          type="button"
        >
          <AlignRight size={18} />
        </button>
      </div>

      {showLinkInput && (
        <div className="flex items-center p-2 border-t border-border-color bg-muted/5">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-3 py-1.5 bg-hover-bg rounded-l-md focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSetLink();
              }
            }}
          />
          <button
            onClick={handleSetLink}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-r-md"
          >
            Add Link
          </button>
        </div>
      )}
    </div>
  );
}
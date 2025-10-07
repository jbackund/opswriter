'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Link2,
  Image as ImageIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Eraser,
  Highlighter,
  Loader2,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}

export default function RichTextEditor({ content, onChange, placeholder, readOnly = false }: RichTextEditorProps) {
  const lastContentRef = useRef(content)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const colorInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#1f2937')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({
        multicolor: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (!readOnly) {
        const html = editor.getHTML()
        lastContentRef.current = html
        onChange(html)
      }
    },
    immediatelyRender: false,
  })

  const focusEditor = (position?: 'start' | 'end') => {
    if (!editor || readOnly) return
    if (position) {
      editor.chain().focus(position).run()
      return
    }
    editor.chain().focus().run()
  }

  useEffect(() => {
    if (!editor) return
    const incoming = content ?? ''
    if (incoming === lastContentRef.current) {
      return
    }
    editor.commands.setContent(incoming, false)
    lastContentRef.current = incoming
  }, [editor, content])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  if (!editor) {
    return null
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const setLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().toggleLink({ href: url }).run()
    }
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      window.alert('Please select a valid image file (.png, .jpg, .gif, .svg).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      window.alert('Images must be smaller than 5MB.')
      return
    }

    setIsUploadingImage(true)

    try {
      const fileAsDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result
          if (typeof result === 'string') {
            resolve(result)
          } else {
            reject(new Error('Invalid image data'))
          }
        }
        reader.onerror = () => {
          reject(reader.error || new Error('Failed to read image file'))
        }
        reader.readAsDataURL(file)
      })

      editor.chain().focus().setImage({ src: fileAsDataUrl }).run()
    } catch (error) {
      console.error('Unexpected error while uploading image:', error)
      window.alert('Unexpected error while uploading the image. Please try again.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const triggerImageUpload = () => {
    if (readOnly) return
    fileInputRef.current?.click()
  }

  const triggerColorPicker = () => {
    if (readOnly) return
    if (editor) {
      const currentColor = editor.getAttributes('textStyle')?.color
      if (currentColor) {
        setSelectedColor(currentColor)
      }
    }
    colorInputRef.current?.click()
  }

  const handleColorChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSelectedColor(value)
    if (!editor) return
    editor.chain().focus().setColor(value).run()
  }

  const clearColor = () => {
    if (!editor) return
    editor.chain().focus().unsetColor().run()
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition focus-within:border-docgen-blue focus-within:ring-2 focus-within:ring-docgen-blue/20">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={colorInputRef}
        type="color"
        className="hidden"
        value={selectedColor}
        onChange={handleColorChange}
      />
      {!readOnly && (
        <div className="bg-gray-50 border-b border-gray-200 px-2 py-1">
          <div className="flex flex-wrap items-center gap-1">
          {/* Text formatting */}
          <div className="flex items-center border-r pr-1 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('bold') ? 'bg-gray-200' : ''
              }`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('italic') ? 'bg-gray-200' : ''
              }`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('underline') ? 'bg-gray-200' : ''
              }`}
              title="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('strike') ? 'bg-gray-200' : ''
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('code') ? 'bg-gray-200' : ''
              }`}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center border-r pr-1 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
              }`}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
              }`}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''
              }`}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center border-r pr-1 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('bulletList') ? 'bg-gray-200' : ''
              }`}
              title="Bullet list"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('orderedList') ? 'bg-gray-200' : ''
              }`}
              title="Numbered list"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('blockquote') ? 'bg-gray-200' : ''
              }`}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-1.5 rounded hover:bg-gray-200"
              title="Horizontal rule"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center border-r pr-1 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''
              }`}
              title="Align left"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''
              }`}
              title="Align center"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''
              }`}
              title="Align right"
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''
              }`}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </button>
          </div>

          {/* Color & highlight */}
          <div className="flex items-center border-r pr-1 mr-1">
            <button
              type="button"
              onClick={triggerColorPicker}
              className="p-1.5 rounded hover:bg-gray-200"
              title="Text color"
            >
              <Palette className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={clearColor}
              className="p-1.5 rounded hover:bg-gray-200"
              title="Clear text color"
            >
              <Eraser className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('highlight') ? 'bg-gray-200' : ''
              }`}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </button>
          </div>

          {/* Insert */}
          <div className="flex items-center border-r pr-1 mr-1">
            <button
              type="button"
              onClick={addTable}
              className="p-1.5 rounded hover:bg-gray-200"
              title="Insert table"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={triggerImageUpload}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={isUploadingImage}
              title="Insert image"
            >
              {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={setLink}
              className={`p-1.5 rounded hover:bg-gray-200 ${
                editor.isActive('link') ? 'bg-gray-200' : ''
              }`}
              title="Insert link"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>

          {/* History */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none bg-white text-gray-900 cursor-text [&>*:first-child]:mt-0 [&_table]:w-full [&_table]:border [&_table]:border-gray-300 [&_table]:border-collapse [&_th]:bg-gray-50 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-gray-50/50"
        placeholder={placeholder}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !editor.isFocused) {
            focusEditor('end')
          }
        }}
      />
    </div>
  )
}

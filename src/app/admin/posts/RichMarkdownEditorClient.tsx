"use client";

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeCodeMirrorLanguage,
  CodeToggle,
  ConditionalContents,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const editorPlugins = [
  headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
  listsPlugin(),
  quotePlugin(),
  linkPlugin(),
  linkDialogPlugin(),
  imagePlugin({
    disableImageResize: true,
    disableImageSettingsButton: true,
  }),
  tablePlugin(),
  thematicBreakPlugin(),
  codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      bash: "Bash",
      css: "CSS",
      html: "HTML",
      js: "JavaScript",
      json: "JSON",
      jsx: "JSX",
      md: "Markdown",
      text: "Plain text",
      ts: "TypeScript",
      tsx: "TSX",
    },
  }),
  diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
  toolbarPlugin({
    toolbarClassName: "admin-md-toolbar",
    toolbarContents: () => (
      <DiffSourceToggleWrapper>
        <ConditionalContents
          options={[
            {
              when: (editor) => editor?.editorType === "codeblock",
              contents: () => <ChangeCodeMirrorLanguage />,
            },
            {
              fallback: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <Separator />
                  <ListsToggle options={["bullet", "number", "check"]} />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertCodeBlock />
                  <InsertThematicBreak />
                </>
              ),
            },
          ]}
        />
      </DiffSourceToggleWrapper>
    ),
  }),
  markdownShortcutPlugin(),
];

export default function RichMarkdownEditorClient({ value, onChange }: Props) {
  return (
    <MDXEditor
      markdown={value}
      onChange={(markdown, initialMarkdownNormalize) => {
        if (!initialMarkdownNormalize) {
          onChange(markdown);
        }
      }}
      plugins={editorPlugins}
      className="admin-md-editor"
      contentEditableClassName="admin-md-content prose-content"
      placeholder="开始写正文..."
      suppressHtmlProcessing
      spellCheck
    />
  );
}

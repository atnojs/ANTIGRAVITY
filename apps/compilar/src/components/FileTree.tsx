import React, { useState } from "react";
import { Folder, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { FileItem } from "../types.js";

interface FileTreeProps {
  files: FileItem[];
  depth?: number;
}

const FileNode: React.FC<{ node: FileItem; depth: number }> = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto expansion to keep UI readable

  const isDirectory = node.type === "directory";

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return "";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="select-none font-mono text-sm leading-relaxed" id={`file-node-${node.path.replace(/\//g, "-")}`}>
      <div 
        className={`flex items-center justify-between py-1 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer ${
          isDirectory ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-600 dark:text-neutral-400"
        }`}
        style={{ paddingLeft: `${depth * 14}px` }}
        onClick={() => isDirectory && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isDirectory ? (
            <>
              <span className="text-neutral-400">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <Folder size={15} className="text-amber-500 fill-amber-500/20 shrink-0" />
            </>
          ) : (
            <>
              <span className="w-3.5" />
              <FileText size={15} className="text-sky-500 shrink-0" />
            </>
          )}
          <span className="truncate text-xs">{node.name}</span>
        </div>
        {!isDirectory && node.size !== undefined && (
          <span className="text-[10px] text-neutral-400 shrink-0">{formatSize(node.size)}</span>
        )}
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <FileNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ files }) => {
  if (!files || files.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-400 text-xs font-mono">
        No hay archivos cargados.
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50/50 dark:bg-neutral-900/30 max-h-[350px] overflow-y-auto custom-scrollbar" id="project-file-tree-container">
      <div className="flex flex-col gap-0.5">
        {files.map((file) => (
          <FileNode key={file.path} node={file} depth={0} />
        ))}
      </div>
    </div>
  );
};

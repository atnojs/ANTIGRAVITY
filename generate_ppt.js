const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// ─── Scan folder structure ────────────────────────────────────────
function scanDir(dir, depth = 0, maxDepth = 3) {
  const result = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".git" || entry.name === "package-lock.json" || entry.name === "bun.lockb") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push({ name: entry.name, type: "folder", depth, children: depth < maxDepth ? scanDir(fullPath, depth + 1, maxDepth) : [] });
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        const langMap = { ".ps1":"PowerShell",".py":"Python",".js":"JavaScript",".ts":"TypeScript",".tsx":"React TSX",".rs":"Rust",".php":"PHP",".html":"HTML",".css":"CSS",".md":"Markdown",".json":"JSON",".yaml":"YAML",".yml":"YAML",".sh":"Shell",".cmd":"CMD",".bat":"BAT",".sql":"SQL",".txt":"Text",".xml":"XML",".svg":"SVG",".png":"Image",".jpg":"Image",".jpeg":"Image",".gif":"Image",".ico":"Icon",".exe":"Binary",".dll":"Binary",".so":"Binary",".pdf":"PDF",".zip":"Archive",".tar":"Archive",".gz":"Archive" };
        result.push({ name: entry.name, type: "file", depth, ext, lang: langMap[ext] || ext.replace(".","") || "File" });
      }
    }
  } catch (e) {}
  return result;
}

const rootDir = "E:/ANTIGRAVITY";
const structure = scanDir(rootDir);

// ─── Color palette (dark cyberpunk 3D) ────────────────────────────
const BG_DARK    = "0D0D1A";
const BG_CARD    = "1A1A2E";
const ACCENT1    = "00F5D4";  // cyan
const ACCENT2    = "F72585";  // magenta
const ACCENT3    = "7209B7";  // purple
const ACCENT4    = "4CC9F0";  // light blue
const ACCENT5    = "FFBE0B";  // gold
const WHITE      = "FFFFFF";
const GRAY       = "8892B0";
const GRAY_DARK  = "2A2A3E";

// ─── Create presentation ──────────────────────────────────────────
const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "PPT Creator";
pptx.title = "ANTIGRAVITY - 3D Structure";
pptx.subject = "Folder Structure Visualization";

// ─── Helper: 3D box shape ─────────────────────────────────────────
function add3DBox(slide, x, y, w, h, fillColor, borderColor, shadow) {
  // Main face
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: fillColor },
    line: { color: borderColor, width: 1.5 },
    shadow: shadow ? { type: "outer", blur: 8, offset: 3, color: "000000", opacity: 0.4 } : undefined,
    rectRadius: 0.05,
  });
  // Top highlight (3D effect)
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.04,
    fill: { color: WHITE },
    line: { width: 0 },
    transparency: 75,
  });
  // Left highlight (3D effect)
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.04, h,
    fill: { color: WHITE },
    line: { width: 0 },
    transparency: 80,
  });
}

// ─── Helper: 3D connector line ────────────────────────────────────
function add3DConnector(slide, x1, y1, x2, y2, color) {
  slide.addShape(pptx.ShapeType.line, {
    x: Math.min(x1,x2), y: Math.min(y1,y2),
    w: Math.abs(x2-x1) || 0.01, h: Math.abs(y2-y1) || 0.01,
    line: { color, width: 2, dashType: "dash" },
    flipV: y2 < y1,
    flipH: x2 < x1,
  });
}

// ─── SLIDE 1: Title ───────────────────────────────────────────────
let slide1 = pptx.addSlide();
slide1.background = { fill: BG_DARK };

// Big 3D cube background
add3DBox(slide1, 1.5, 0.8, 10.5, 5.5, BG_CARD, ACCENT3, true);

// Glowing title
slide1.addText("ANTIGRAVITY", {
  x: 1.8, y: 1.5, w: 10, h: 1.5,
  fontSize: 60, fontFace: "Arial Black",
  color: ACCENT1, bold: true,
  shadow: { type: "outer", blur: 20, color: ACCENT1, offset: 0, opacity: 0.6 },
});

// Subtitle
slide1.addText("3D Project Structure Visualization", {
  x: 1.8, y: 3.0, w: 10, h: 0.8,
  fontSize: 28, fontFace: "Arial",
  color: ACCENT4, italic: true,
});

// Stats line
const totalFolders = structure.filter(e => e.type === "folder").length;
const totalFiles = structure.filter(e => e.type === "file").length;
const allFiles = [];
function countAll(items) { items.forEach(i => { if(i.type==="file") allFiles.push(i); if(i.children) countAll(i.children); }); }
countAll(structure);
const langs = [...new Set(allFiles.map(f => f.lang).filter(Boolean))];

slide1.addText(`${totalFolders} root folders  |  ${totalFiles} root files  |  ${langs.length} file types`, {
  x: 1.8, y: 4.2, w: 10, h: 0.6,
  fontSize: 18, fontFace: "Arial",
  color: GRAY,
});

// Bottom accent bar
slide1.addShape(pptx.ShapeType.rect, {
  x: 1.8, y: 5.4, w: 10, h: 0.06,
  fill: { color: ACCENT2 },
  line: { width: 0 },
  shadow: { type: "outer", blur: 12, color: ACCENT2, offset: 0, opacity: 0.5 },
});

// ─── SLIDE 2: Root Overview (3D isometric-style) ──────────────────
let slide2 = pptx.addSlide();
slide2.background = { fill: BG_DARK };

slide2.addText("ROOT OVERVIEW", {
  x: 0.3, y: 0.2, w: 12, h: 0.8,
  fontSize: 32, fontFace: "Arial Black", color: ACCENT1, bold: true,
  shadow: { type: "outer", blur: 10, color: ACCENT1, offset: 0, opacity: 0.5 },
});

slide2.addShape(pptx.ShapeType.rect, {
  x: 0.3, y: 0.95, w: 3, h: 0.04,
  fill: { color: ACCENT2 }, line: { width: 0 },
});

const folders = structure.filter(e => e.type === "folder");
const files = structure.filter(e => e.type === "file");

// 3D folder cards in a grid
let col = 0, row = 0;
const cardW = 2.8, cardH = 1.6, gapX = 0.3, gapY = 0.25;
const startX = 0.5, startY = 1.3;
const depthColors = [ACCENT1, ACCENT2, ACCENT3, ACCENT4, ACCENT5, "9B5DE5", "F15BB5", "00BBF9", "FEE440", "00F5D4", "7209B7", "4CC9F0"];

folders.forEach((folder, i) => {
  const x = startX + col * (cardW + gapX);
  const y = startY + row * (cardH + gapY);
  const accentColor = depthColors[i % depthColors.length];

  // 3D card
  add3DBox(slide2, x, y, cardW, cardH, BG_CARD, accentColor, true);

  // Folder icon (emoji-like)
  slide2.addText("📁", {
    x: x + 0.15, y: y + 0.1, w: 0.6, h: 0.5,
    fontSize: 22,
  });

  // Folder name
  slide2.addText(folder.name, {
    x: x + 0.1, y: y + 0.55, w: cardW - 0.2, h: 0.45,
    fontSize: 11, fontFace: "Arial Black", color: accentColor, bold: true,
    breakLine: true, shrinkText: true,
  });

  // Sub-items count
  const subCount = folder.children ? folder.children.length : 0;
  slide2.addText(`${subCount} items`, {
    x: x + 0.1, y: y + 1.0, w: cardW - 0.2, h: 0.35,
    fontSize: 9, fontFace: "Arial", color: GRAY,
  });

  // Bottom accent line on card
  slide2.addShape(pptx.ShapeType.rect, {
    x: x + 0.1, y: y + cardH - 0.12, w: cardW - 0.2, h: 0.04,
    fill: { color: accentColor }, line: { width: 0 },
    shadow: { type: "outer", blur: 6, color: accentColor, offset: 0, opacity: 0.3 },
  });

  col++;
  if (col >= 4) { col = 0; row++; }
});

// ─── SLIDE 3+: One slide per major folder ─────────────────────────
folders.forEach((folder, folderIdx) => {
  if (!folder.children || folder.children.length === 0) return;
  
  let slide = pptx.addSlide();
  slide.background = { fill: BG_DARK };
  const accentColor = depthColors[folderIdx % depthColors.length];

  // Title
  slide.addText(folder.name.toUpperCase(), {
    x: 0.3, y: 0.2, w: 12, h: 0.8,
    fontSize: 30, fontFace: "Arial Black", color: accentColor, bold: true,
    shadow: { type: "outer", blur: 10, color: accentColor, offset: 0, opacity: 0.5 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.3, y: 0.95, w: 3, h: 0.04,
    fill: { color: accentColor }, line: { width: 0 },
  });

  // Tree-style 3D layout
  let yPos = 1.2;
  const leftMargin = 0.5;
  const maxPerCol = 14;
  
  function renderTree(items, depth, currentX) {
    items.forEach((item, idx) => {
      if (yPos > 6.8) return; // Don't overflow slide
      
      const indent = currentX;
      const isFolder = item.type === "folder";
      const itemColor = isFolder ? accentColor : ACCENT4;
      const bgColor = isFolder ? BG_CARD : "141428";

      // 3D box for each item
      const boxW = Math.min(3.2 - depth * 0.15, 3.2);
      const boxH = 0.36;
      
      if (indent + boxW < 13) {
        add3DBox(slide, indent, yPos, boxW, boxH, bgColor, itemColor, false);

        // Icon
        slide.addText(isFolder ? "📁" : "📄", {
          x: indent + 0.05, y: yPos + 0.02, w: 0.3, h: boxH,
          fontSize: 10,
        });

        // Name
        slide.addText(item.name, {
          x: indent + 0.35, y: yPos + 0.02, w: boxW - 0.45, h: boxH,
          fontSize: 9, fontFace: "Arial", color: itemColor, bold: isFolder,
          shrinkText: true, valign: "middle",
        });

        // Language tag for files
        if (!isFolder && item.lang && item.lang !== "File") {
          slide.addText(item.lang, {
            x: indent + boxW - 0.8, y: yPos + 0.05, w: 0.75, h: 0.25,
            fontSize: 7, fontFace: "Arial", color: BG_DARK, bold: true,
            fill: { color: accentColor }, align: "center", valign: "middle",
            rectRadius: 0.03,
          });
        }

        // Depth indicator (3D depth lines)
        if (depth > 0) {
          slide.addShape(pptx.ShapeType.line, {
            x: indent - 0.15, y: yPos + boxH / 2,
            w: 0.15, h: 0,
            line: { color: GRAY_DARK, width: 1, dashType: "dash" },
          });
        }
      }
      
      yPos += boxH + 0.06;

      if (isFolder && item.children && item.children.length > 0 && depth < 3) {
        renderTree(item.children, depth + 1, indent + 0.3);
      }
    });
  }

  renderTree(folder.children, 0, leftMargin);
});

// ─── SLIDE: File Types Breakdown ──────────────────────────────────
let slideTypes = pptx.addSlide();
slideTypes.background = { fill: BG_DARK };

slideTypes.addText("FILE TYPES", {
  x: 0.3, y: 0.2, w: 12, h: 0.8,
  fontSize: 32, fontFace: "Arial Black", color: ACCENT5, bold: true,
  shadow: { type: "outer", blur: 10, color: ACCENT5, offset: 0, opacity: 0.5 },
});
slideTypes.addShape(pptx.ShapeType.rect, {
  x: 0.3, y: 0.95, w: 3, h: 0.04,
  fill: { color: ACCENT5 }, line: { width: 0 },
});

// Count file types
const langCount = {};
allFiles.forEach(f => {
  const l = f.lang || "Other";
  langCount[l] = (langCount[l] || 0) + 1;
});
const sortedLangs = Object.entries(langCount).sort((a,b) => b[1] - a[1]);
const maxCount = sortedLangs.length > 0 ? sortedLangs[0][1] : 1;

sortedLangs.forEach(([lang, count], i) => {
  const y = 1.3 + i * 0.42;
  const barMaxW = 8;
  const barW = (count / maxCount) * barMaxW;
  const barColor = depthColors[i % depthColors.length];

  // Bar background
  add3DBox(slideTypes, 2.8, y, barMaxW, 0.32, GRAY_DARK, "333355", false);

  // Filled bar
  if (barW > 0.05) {
    add3DBox(slideTypes, 2.8, y, barW, 0.32, barColor, barColor, false);
    // Glow
    slideTypes.addShape(pptx.ShapeType.rect, {
      x: 2.8, y: y, w: 0.03, h: 0.32,
      fill: { color: WHITE }, line: { width: 0 }, transparency: 60,
    });
  }

  // Label
  slideTypes.addText(lang, {
    x: 0.3, y: y, w: 2.4, h: 0.32,
    fontSize: 11, fontFace: "Arial", color: barColor, bold: true, align: "right", valign: "middle",
  });

  // Count
  slideTypes.addText(String(count), {
    x: 2.8 + barMaxW + 0.2, y: y, w: 1, h: 0.32,
    fontSize: 11, fontFace: "Arial", color: WHITE, bold: true, valign: "middle",
  });
});

// ─── SLIDE: Full Tree Text ────────────────────────────────────────
let slideTree = pptx.addSlide();
slideTree.background = { fill: BG_DARK };

slideTree.addText("COMPLETE TREE", {
  x: 0.3, y: 0.2, w: 12, h: 0.8,
  fontSize: 32, fontFace: "Arial Black", color: ACCENT2, bold: true,
  shadow: { type: "outer", blur: 10, color: ACCENT2, offset: 0, opacity: 0.5 },
});
slideTree.addShape(pptx.ShapeType.rect, {
  x: 0.3, y: 0.95, w: 3, h: 0.04,
  fill: { color: ACCENT2 }, line: { width: 0 },
});

// Build tree text
function buildTreeText(items, prefix = "", isLast = true) {
  let lines = [];
  items.forEach((item, i) => {
    const last = i === items.length - 1;
    const connector = last ? "└── " : "├── ";
    const icon = item.type === "folder" ? "📁 " : "📄 ";
    lines.push(prefix + connector + icon + item.name);
    if (item.children && item.children.length > 0) {
      const newPrefix = prefix + (last ? "    " : "│   ");
      lines = lines.concat(buildTreeText(item.children, newPrefix, last));
    }
  });
  return lines;
}

const treeLines = buildTreeText(structure);
const treeText = treeLines.join("\n");

// Split into columns if too many lines
const maxLinesPerCol = 28;
const cols = [];
for (let i = 0; i < treeLines.length; i += maxLinesPerCol) {
  cols.push(treeLines.slice(i, i + maxLinesPerCol).join("\n"));
}

const colWidth = Math.min(6.5, 12.5 / cols.length);
cols.forEach((text, ci) => {
  // 3D panel
  add3DBox(slideTree, 0.3 + ci * (colWidth + 0.2), 1.15, colWidth, 5.5, BG_CARD, ACCENT3, true);
  
  slideTree.addText(text, {
    x: 0.5 + ci * (colWidth + 0.2), y: 1.3, w: colWidth - 0.4, h: 5.2,
    fontSize: 8, fontFace: "Consolas", color: ACCENT4, valign: "top",
    shrinkText: true,
  });
});

// ─── Save ──────────────────────────────────────────────────────────
const outputPath = "E:/ANTIGRAVITY/ANTIGRAVITY_3D_Structure.pptx";
pptx.writeFile({ fileName: outputPath })
  .then(() => {
    console.log("SUCCESS: " + outputPath);
  })
  .catch(err => {
    console.error("ERROR: " + err.message);
  });

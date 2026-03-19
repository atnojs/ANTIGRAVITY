// Reemplaza tu función de render de Markdown por esta:
function safeRenderMD(md){
  function esc(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  md = esc(md);
  md = md.replace(new RegExp("^```([\\s\\S]*?)```","g"), function(_,c){ return "<pre><code>"+c+"</code></pre>"; });
  md = md.replace(new RegExp("^###\\s+(.*)$","gm"), "<h3>$1</h3>");
  md = md.replace(new RegExp("^##\\s+(.*)$","gm"), "<h2>$1</h2>");
  md = md.replace(new RegExp("^#\\s+(.*)$","gm"), "<h1>$1</h1>");
  const lines = md.split("\n"); let html="", inList=false;
  for(const raw of lines){
    const line = raw.trimEnd();
    if(/^<pre>/.test(line) || /^<\/pre>/.test(line) || /^<h[1-3]>/.test(line)){
      if(inList){ html+="</ul>"; inList=false; }
      html += line+"\n"; continue;
    }
    if(/^\-\s+/.test(line)){
      if(!inList){ html+="<ul>"; inList=true; }
      html += "<li>"+ line.replace(/^\-\s+/,"") +"</li>"; continue;
    }
    if(line===""){
      if(inList){ html+="</ul>"; inList=false; }
      html += "\n"; continue;
    }
    if(inList){ html+="</ul>"; inList=false; }
    if(/^<(h[1-3]|ul|li|pre|code)/.test(line)) html += line+"\n";
    else html += "<p>"+ line +"</p>\n";
  }
  if(inList) html+="</ul>";
  return html;
}

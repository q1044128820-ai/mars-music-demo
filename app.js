/* Mars Music - standalone browser demo. Local audio never leaves this browser. */
(() => {
  "use strict";
  const MOCK = [
    {id:"demo-01",title:"赤色轨道",artist:"Mars Studio",album:"火星漫游日志",duration:218,art:"art-nebula",demo:true},
    {id:"demo-02",title:"凌晨三点的宇宙",artist:"星际信号",album:"深夜频率",duration:246,art:"art-night",demo:true},
    {id:"demo-03",title:"光年以外的风",artist:"Nova",album:"宇宙里的声音",duration:205,art:"art-ocean",demo:true},
    {id:"demo-04",title:"落日的最后一束光",artist:"Mars Studio",album:"黄昏漫游",duration:193,art:"art-sunset",demo:true},
    {id:"demo-05",title:"信号仍在发送",artist:"Orbit 09",album:"火星漫游日志",duration:234,art:"art-pulse",demo:true},
    {id:"demo-06",title:"逃离引力",artist:"Nova",album:"轨道之外",duration:202,art:"art-cinder",demo:true}
  ];
  const FEATURED = [
    {title:"深夜漫游",sub:"适合一个人听的宇宙",no:"001 / NIGHT DRIVE",card:"card-1"},
    {title:"星际来信",sub:"接收来自远方的信号",no:"002 / SPACE SIGNAL",card:"card-2"},
    {title:"落日频率",sub:"把温柔留给日落时分",no:"003 / SUNSET RADIO",card:"card-3"}
  ];
  const $ = (id) => document.getElementById(id);
  const all = (sel) => [...document.querySelectorAll(sel)];
  const audio = $("audio-player");
  let localSongs = [];
  let nextId = 1;
  let currentId = null;
  let mode = "repeat"; // repeat | shuffle | single
  let activeView = "home";
  let toastTimer = null;
  let favorites = new Set();
  try { favorites = new Set(JSON.parse(localStorage.getItem("mars-demo-likes") || "[]")); } catch { favorites = new Set(); }
  const icon = (id) => '<svg aria-hidden="true"><use href="#ic-' + id + '"/></svg>';
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const formatTime = (s) => { if (!isFinite(s)||s<0) return "0:00"; const x=Math.floor(s); return Math.floor(x/60)+":"+String(x%60).padStart(2,"0"); };
  const songs = () => [...localSongs, ...MOCK];
  const findSong = (id) => songs().find(s => s.id === id);
  const current = () => findSong(currentId);
  const playing = () => !audio.paused && !!audio.currentSrc;
  const el = (tag, className, value) => { const node=document.createElement(tag); node.className=className; if(value!==undefined)node.textContent=value; return node; };
  function toast(message) {
    const box=$("toast"); box.textContent=message; box.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>box.classList.remove("show"),3400);
  }
  function persistFavorites(){try{localStorage.setItem("mars-demo-likes",JSON.stringify([...favorites]));}catch{}}
  function songRow(song, index){
    const row=el("div","track-row"+(song.id===currentId?" current":""));
    const num=el("span","track-num",String(index+1).padStart(2,"0"));
    const cover=el("button","cover "+song.art); cover.type="button"; cover.setAttribute("aria-label","播放 "+song.title); cover.addEventListener("click",()=>playSong(song.id));
    const text=el("button","track-main track-open"); text.type="button";
    const title=el("strong","",song.title); const artist=el("small","",song.artist+(song.demo?" · 概念演示":" · 本地文件"));
    text.append(title,artist); text.addEventListener("click",()=>playSong(song.id));
    const album=el("span","track-album",song.album);
    const duration=el("span","track-duration",formatTime(song.duration));
    const liked=favorites.has(song.id);
    const like=el("button","track-like"+(liked?" liked":""));
    like.type="button"; like.setAttribute("aria-label",liked?"取消收藏":"收藏 "+song.title);
    like.innerHTML=icon("heart"); like.addEventListener("click",()=>toggleFavorite(song.id));
    row.append(num,cover,text,album,duration,like);
    return row;
  }
  function renderList(target, list, emptyText){
    const box=$(target); box.replaceChildren();
    if(!list.length){box.append(el("div","list-empty",emptyText||"这里还没有歌曲"));return;}
    list.forEach((song,i)=>box.append(songRow(song,i)));
  }
  function renderFeatured(){
    const box=$("featured-grid"); box.replaceChildren();
    FEATURED.forEach((item)=>{
      const button=el("button","featured-card "+item.card);
      button.innerHTML='<span class="feature-no">'+escapeHTML(item.no)+'</span><span class="feature-object"></span><strong>'+escapeHTML(item.title)+'</strong><small>'+escapeHTML(item.sub)+'</small>';
      button.addEventListener("click",()=>{navigate("search");$("search-input").value=item.title.includes("星际")?"信号":item.title.includes("落日")?"落日":"凌晨";renderSearch();});
      box.append(button);
    });
  }
  function renderSearch(){
    const q=$("search-input").value.toLocaleLowerCase().trim();
    const found=songs().filter(s => [s.title,s.artist,s.album].some(v=>v.toLocaleLowerCase().includes(q)));
    $("search-heading").textContent=q?"搜索结果":"全部歌曲";
    $("search-result-count").textContent=found.length+" 首";
    renderList("search-results",found,"没有找到相关歌曲，试试其他关键词。");
  }
  function renderAll(){
    renderList("home-track-list",songs().slice(0,8));
    renderSearch();
    renderList("local-results",localSongs);
    const liked=songs().filter(s=>favorites.has(s.id));
    renderList("liked-results",liked,"还没有收藏歌曲，点击歌曲右侧的小爱心吧。");
    $("liked-total").textContent=liked.length;
    $("local-count").textContent=localSongs.length;
    $("local-banner-count").textContent=localSongs.length+" 首本地歌曲";
    $("local-empty").hidden=localSongs.length>0;
    renderQueue();
    renderPlayer();
  }
  function navigate(name){
    activeView=name; all(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
    all("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
    const names={home:"发现好音乐",search:"音乐搜索",local:"本地音乐",liked:"我的收藏",playlists:"我的歌单",settings:"设置中心"};
    $("page-title").textContent=names[name]||names.home;
    $("main-scroll").scrollTop=0;
    $("queue-overlay").hidden=true;
    if(name==="search") renderSearch();
  }
  function toggleFavorite(id){
    if(!id){toast("请先选择一首歌曲");return;}
    if(favorites.has(id)){favorites.delete(id);toast("已取消收藏");}else{favorites.add(id);toast("已加入「我喜欢的」");}
    persistFavorites(); renderAll();
  }
  async function playSong(id){
    const song=findSong(id); if(!song)return;
    if(song.demo){
      toast("「"+song.title+"」是虚构的界面样例，无音频。请先导入你自己的歌曲。");
      return;
    }
    if(currentId===id){togglePlay();return;}
    currentId=id; audio.pause();audio.src=song.url;audio.load();
    renderAll();
    try{await audio.play();}catch(err){toast("无法播放该文件，请尝试 MP3、M4A 或 WAV 格式。");}
  }
  async function togglePlay(){
    const song=current();
    if(!song){if(localSongs.length)await playSong(localSongs[0].id);else{navigate("local");toast("先从设备导入本地音乐，就可以真正播放啦。");}return;}
    if(audio.paused){try{await audio.play();}catch{toast("当前音频无法播放，请重新选择文件。");}}
    else audio.pause();
  }
  function nextSong(direction=1){
    if(!localSongs.length){toast("请先导入本地歌曲");return;}
    if(mode==="shuffle" && localSongs.length>1){
      const choices=localSongs.filter(s=>s.id!==currentId);
      playSong(choices[Math.floor(Math.random()*choices.length)].id);return;
    }
    const ix=localSongs.findIndex(s=>s.id===currentId);
    const next=(ix+direction+localSongs.length)%localSongs.length;
    playSong(localSongs[next].id);
  }
  function advanceMode(){
    mode=mode==="repeat"?"shuffle":mode==="shuffle"?"single":"repeat";
    updateMode();
    toast(mode==="repeat"?"列表循环":mode==="shuffle"?"随机播放":"单曲循环");
  }
  function updateMode(){
    $("setting-mode").textContent=mode==="repeat"?"列表循环":mode==="shuffle"?"随机播放":"单曲循环";
    ["shuffle-btn","full-shuffle"].forEach(id=>$(id).classList.toggle("active",mode==="shuffle"));
    ["repeat-btn","full-repeat"].forEach(id=>$(id).classList.toggle("active",mode==="single"||mode==="repeat"));
    ["repeat-btn","full-repeat"].forEach(id=>$(id).title=mode==="single"?"单曲循环":"列表循环");
  }
  function playerTime(){
    const t=audio.currentTime||0;
    const d=(audio.duration&&isFinite(audio.duration))?audio.duration:(current()?.duration||0);
    const p=d?(t/d)*100:0;
    ["seek-bar","full-seek"].forEach(id=>{const input=$(id);input.value=String(p);input.style.setProperty("--fill",p+"%");});
    $("current-time").textContent=formatTime(t);$("full-current").textContent=formatTime(t);
    $("total-time").textContent=formatTime(d);$("full-total").textContent=formatTime(d);
  }
  function renderPlayer(){
    const song=current(); const isPlaying=playing();
    $("bar-title").textContent=song?song.title:"火星音乐 · 等待启航";
    $("bar-artist").textContent=song?song.artist:"点击导入本地音乐开始播放";
    $("side-title").textContent=song?song.title:"等待你的第一首歌";
    $("side-artist").textContent=song?song.artist:"导入本地音乐，即刻出发";
    $("full-title").textContent=song?song.title:"等待你的第一首歌";
    $("full-artist").textContent=song?song.artist:"导入本地音乐，开启宇宙之旅";
    $("bar-art").className="bar-cover "+(song?song.art:"art-nebula");
    $("panel-cover").className="now-art "+(song?song.art:"art-nebula");
    const loved=!!song&&favorites.has(song.id);
    ["like-current","full-like"].forEach(id=>$(id).classList.toggle("liked",loved));
    ["play-btn","full-play"].forEach(id=>{ $(id).innerHTML=icon(isPlaying?"pause":"play");$(id).setAttribute("aria-label",isPlaying?"暂停":"播放"); });
    document.querySelector(".panel-wave").classList.toggle("playing",isPlaying);
    document.querySelector(".vinyl-wrap").classList.toggle("playing",isPlaying);
    playerTime();
  }
  function renderQueue(){
    const box=$("queue-list");box.replaceChildren();
    if(!localSongs.length){box.append(el("div","list-empty","播放队列为空。导入本地音乐后会自动加入。"));return;}
    localSongs.forEach((song)=>{
      const row=el("button","queue-item"+(song.id===currentId?" active":""));
      const img=el("span","cover "+song.art);const wrap=el("span","");wrap.append(el("strong","",song.title),el("small","",song.artist));
      row.append(img,wrap);row.addEventListener("click",()=>playSong(song.id));box.append(row);
    });
  }
  function importFiles(fileList){
    const list=[...fileList].filter(file => file.type.startsWith("audio/")||/\.(mp3|m4a|aac|flac|wav|ogg|opus)$/i.test(file.name));
    if(!list.length){toast("没有识别到音频文件，试试 MP3、M4A 或 WAV。");return;}
    const available=Math.max(0,100-localSongs.length); const selected=list.slice(0,available);
    selected.forEach(file=>{
      const name=file.name.replace(/\.[^.]+$/,"");
      const parts=name.split(/\s+[-—–]\s+/);
      const artist=parts.length>1?parts[0]:"我的本地音乐";
      const title=parts.length>1?parts.slice(1).join(" - "):name;
      localSongs.push({id:"local-"+(nextId++),title,artist,album:"本地导入",duration:0,art:"art-import",demo:false,url:URL.createObjectURL(file)});
    });
    renderAll();navigate("local");
    toast("成功导入 "+selected.length+" 首歌曲。文件仅留在本机浏览器中。");
    if(!currentId&&selected.length) playSong(localSongs[0].id);
  }
  function openFull(){
    $("full-player").hidden=false;document.body.style.overflow="hidden";renderPlayer();
  }
  function closeFull(){
    $("full-player").hidden=true;document.body.style.overflow="";
  }
  // Global navigation, buttons, controls
  all("[data-view]").forEach(b=>b.addEventListener("click",e=>{if(b.tagName==="A")e.preventDefault();navigate(b.dataset.view);}));
  $("quick-search").addEventListener("click",()=>{navigate("search");$("search-input").focus();});
  $("search-input").addEventListener("input",renderSearch);
  $("audio-input").addEventListener("change",(e)=>{if(e.target.files.length)importFiles(e.target.files);e.target.value="";});
  ["play-btn","full-play"].forEach(id=>$(id).addEventListener("click",togglePlay));
  ["next-btn","full-next"].forEach(id=>$(id).addEventListener("click",()=>nextSong(1)));
  ["previous-btn","full-prev"].forEach(id=>$(id).addEventListener("click",()=>nextSong(-1)));
  ["shuffle-btn","repeat-btn","full-shuffle","full-repeat","setting-mode"].forEach(id=>$(id).addEventListener("click",advanceMode));
  ["like-current","full-like"].forEach(id=>$(id).addEventListener("click",()=>toggleFavorite(currentId)));
  ["open-full-player","open-full-player-right","panel-cover"].forEach(id=>$(id).addEventListener("click",openFull));
  $("close-full").addEventListener("click",closeFull);
  $("queue-button").addEventListener("click",()=>{$("queue-overlay").hidden=!$("queue-overlay").hidden;renderQueue();});
  $("close-queue").addEventListener("click",()=>{$("queue-overlay").hidden=true;});
  ["playlist-night","playlist-space"].forEach(id=>$(id).addEventListener("click",()=>{navigate("search");$("search-input").value=id==="playlist-night"?"凌晨":"信号";renderSearch();toast("这是演示歌单，展示的曲目不含在线音源。");}));
  ["seek-bar","full-seek"].forEach(id=>$(id).addEventListener("input",(e)=>{
    if(!audio.duration||!isFinite(audio.duration))return;
    audio.currentTime=(Number(e.target.value)/100)*audio.duration;playerTime();
  }));
  $("volume-bar").addEventListener("input",e=>{audio.volume=Number(e.target.value)/100;e.target.style.setProperty("--fill",e.target.value+"%");});
  audio.volume=.72;$("volume-bar").style.setProperty("--fill","72%");
  audio.addEventListener("timeupdate",playerTime);
  audio.addEventListener("loadedmetadata",()=>{const song=current();if(song&&isFinite(audio.duration)){song.duration=audio.duration;renderAll();}});
  audio.addEventListener("play",renderPlayer);
  audio.addEventListener("pause",renderPlayer);
  audio.addEventListener("ended",()=>{if(mode==="single"){audio.currentTime=0;audio.play().catch(()=>{});}else nextSong(1);});
  audio.addEventListener("error",()=>{if(currentId)toast("该音频格式可能不受当前浏览器支持。");});
  document.addEventListener("keydown",e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();navigate("search");$("search-input").focus();}
    if(e.key==="Escape"){closeFull();$("queue-overlay").hidden=true;}
    if(e.code==="Space"&&!(e.target instanceof HTMLInputElement)){e.preventDefault();togglePlay();}
  });
  window.addEventListener("pagehide",()=>localSongs.forEach(s=>URL.revokeObjectURL(s.url)));
  // Initial paint
  renderFeatured();updateMode();renderAll();
  const style=document.createElement("style");
  style.textContent=".list-empty{padding:30px 10px;text-align:center;color:#77717d;font-size:12px}";
  document.head.append(style);
})();
(() => {
  const $ = (s) => document.querySelector(s);
  const fileInput = $("#fileInput"), dropzone = $("#dropzone"), editor = $("#editor");
  const canvas = $("#previewCanvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
  const originalCanvas = document.createElement("canvas");
  const originalCtx = originalCanvas.getContext("2d");
  let image = null, imageName = "photo", compare = false, toastTimer;

  const controls = {
    brightness: $("#brightness"), contrast: $("#contrast"), saturation: $("#saturation"),
    hue: $("#hue"), blur: $("#blur"), gray: $("#gray"), sepia: $("#sepia"),
    strength: $("#strength")
  };
  const defaults = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, gray:0, sepia:0, strength:55 };
  const presets = {
    original: {brightness:100,contrast:100,saturation:100,hue:0,blur:0,gray:0,sepia:0,neon:false,vignette:false,rgb:false},
    cyberpunk: {brightness:108,contrast:125,saturation:155,hue:0,blur:0,gray:0,sepia:0,neon:true,vignette:true,rgb:true},
    neon: {brightness:105,contrast:118,saturation:175,hue:320,blur:0,gray:0,sepia:0,neon:true,vignette:false,rgb:false},
    anime: {brightness:112,contrast:112,saturation:130,hue:185,blur:0,gray:0,sepia:0,neon:false,vignette:false,rgb:false},
    vintage: {brightness:105,contrast:90,saturation:75,hue:15,blur:0,gray:0,sepia:45,neon:false,vignette:true,rgb:false},
    mono: {brightness:105,contrast:120,saturation:0,hue:0,blur:0,gray:100,sepia:0,neon:false,vignette:true,rgb:false}
  };

  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }
  function setEditorReady(ready) {
    $("#compareBtn").disabled = !ready; $("#resetBtn").disabled = !ready;
    $("#downloadBtn").disabled = !ready; $("#downloadBtnBottom").disabled = !ready;
  }
  function updateLabels() {
    $("#brightnessVal").textContent = controls.brightness.value + "%";
    $("#contrastVal").textContent = controls.contrast.value + "%";
    $("#saturationVal").textContent = controls.saturation.value + "%";
    $("#hueVal").textContent = controls.hue.value + "°";
    $("#blurVal").textContent = controls.blur.value + "px";
    $("#grayVal").textContent = controls.gray.value + "%";
    $("#sepiaVal").textContent = controls.sepia.value + "%";
    $("#strengthVal").textContent = controls.strength.value + "%";
  }
  function controlValues() {
    return Object.fromEntries(Object.entries(controls).map(([key, el]) => [key, Number(el.value)]));
  }
  function setValues(values) {
    Object.entries(values).forEach(([key, value]) => { if (controls[key]) controls[key].value = value; });
    updateLabels();
  }
  function activeEffects() {
    return {neon: $("#neonToggle").checked, vignette: $("#vignetteToggle").checked, rgb: $("#rgbToggle").checked};
  }
  function render() {
    if (!image) return;
    updateLabels();
    const w = originalCanvas.width, h = originalCanvas.height;
    canvas.width = w; canvas.height = h;
    const values = controlValues(), effects = activeEffects();
    const useOriginal = compare;
    ctx.clearRect(0, 0, w, h);
    if (useOriginal) {
      ctx.drawImage(originalCanvas, 0, 0);
    } else {
      ctx.save();
      ctx.filter = `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%) hue-rotate(${values.hue}deg) grayscale(${values.gray}%) sepia(${values.sepia}%) blur(${values.blur}px)`;
      ctx.drawImage(originalCanvas, 0, 0);
      ctx.restore();
      if (effects.rgb) {
        const strength = values.strength / 100;
        ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = .17 * strength;
        ctx.globalFilter = "none";
        ctx.drawImage(originalCanvas, -Math.max(1, Math.round(3 * strength)), 0);
        ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = .12 * strength;
        ctx.drawImage(originalCanvas, Math.max(1, Math.round(3 * strength)), 0);
        ctx.restore();
      }
      if (effects.neon) {
        const glow = ctx.createLinearGradient(0, 0, w, h);
        glow.addColorStop(0, `rgba(35,240,255,${.13 * values.strength/55})`);
        glow.addColorStop(.48, "rgba(95,45,255,0.03)");
        glow.addColorStop(1, `rgba(255,35,190,${.13 * values.strength/55})`);
        ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = glow; ctx.fillRect(0,0,w,h); ctx.restore();
      }
      if (effects.vignette) {
        const radius = Math.max(w,h) * .72;
        const gradient = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.18,w/2,h/2,radius);
        gradient.addColorStop(0,"rgba(0,0,0,0)");
        gradient.addColorStop(1,`rgba(0,0,12,${.68 * values.strength/100})`);
        ctx.fillStyle = gradient; ctx.fillRect(0,0,w,h);
      }
    }
    $("#previewWrap").classList.toggle("no-scan", !$("#scanToggle").checked || useOriginal);
    $("#imageStatus").textContent = useOriginal ? "ORIGINAL PREVIEW" : "EDITED PREVIEW";
  }
  function loadFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { showToast("Please choose a JPG, PNG or WebP image."); return; }
    if (file.size > 15 * 1024 * 1024) { showToast("Please choose an image smaller than 15 MB."); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      image = img; imageName = file.name.replace(/\.[^.]+$/, "") || "photo";
      const maxSide = 1800, scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
      originalCanvas.width = w; originalCanvas.height = h;
      originalCtx.clearRect(0,0,w,h); originalCtx.drawImage(img,0,0,w,h);
      canvas.width = w; canvas.height = h;
      $("#fileName").textContent = file.name; $("#imageStatus").textContent = "IMAGE LOADED";
      dropzone.classList.add("hidden"); editor.classList.remove("hidden"); setEditorReady(true);
      resetAll(false); render(); showToast("Photo loaded. Choose a preset or adjust the controls.");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); showToast("This image could not be opened."); };
    img.src = url;
  }
  function resetAll(showMessage = true) {
    setValues(defaults);
    $("#neonToggle").checked = false; $("#scanToggle").checked = true;
    $("#vignetteToggle").checked = false; $("#rgbToggle").checked = false;
    compare = false; $("#compareBtn").classList.remove("active");
    document.querySelectorAll(".preset").forEach(b => b.classList.toggle("active", b.dataset.preset === "original"));
    render(); if (showMessage) showToast("Adjustments reset.");
  }
  function applyPreset(name) {
    const preset = presets[name]; if (!preset) return;
    setValues({...defaults, ...Object.fromEntries(Object.entries(preset).filter(([k]) => controls[k]))});
    $("#neonToggle").checked = !!preset.neon; $("#vignetteToggle").checked = !!preset.vignette;
    $("#rgbToggle").checked = !!preset.rgb; compare = false;
    $("#compareBtn").classList.remove("active");
    document.querySelectorAll(".preset").forEach(b => b.classList.toggle("active", b.dataset.preset === name));
    render(); if (!image) showToast("Preset selected — upload a photo to preview it.");
  }
  function download() {
    if (!image) return;
    compare = false; render();
    canvas.toBlob(blob => {
      if (!blob) { showToast("Could not export this image."); return; }
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = `${imageName}-maha-edited.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Your edited PNG is ready.");
    }, "image/png");
  }

  $("#uploadBtn").addEventListener("click", () => fileInput.click());
  $("#replaceBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", e => { loadFile(e.target.files[0]); e.target.value = ""; });
  dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("dragover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", e => { e.preventDefault(); dropzone.classList.remove("dragover"); loadFile(e.dataTransfer.files[0]); });
  Object.values(controls).forEach(el => el.addEventListener("input", () => { compare = false; render(); }));
  ["neonToggle","scanToggle","vignetteToggle","rgbToggle"].forEach(id => $("#"+id).addEventListener("change", render));
  document.querySelectorAll(".preset").forEach(btn => btn.addEventListener("click", () => applyPreset(btn.dataset.preset)));
  $("#resetSlidersBtn").addEventListener("click", () => resetAll());
  $("#resetBtn").addEventListener("click", () => resetAll());
  $("#compareBtn").addEventListener("click", () => { if (!image) return; compare = !compare; $("#compareBtn").classList.toggle("active", compare); render(); });
  $("#downloadBtn").addEventListener("click", download);
  $("#downloadBtnBottom").addEventListener("click", download);
  applyPreset("original");
})();
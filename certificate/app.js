/*
 * FTS Mahila Samiti, Bangalore - certificate generator.
 *
 * Everything runs in the browser: the template image is loaded, the name is
 * drawn on the blank line with pdf-lib, and the PDF is handed to the user as a
 * download. Nothing is sent to a server.
 */
(function () {
  "use strict";

  var PDFDocument = PDFLib.PDFDocument;
  var rgb = PDFLib.rgb;

  // ---- Template geometry --------------------------------------------------
  // Measured from the 300 DPI source (3508 x 2480 px) and converted to points.
  var PAGE_W = 841.89;
  var PAGE_H = 595.276;
  var CENTER_X = PAGE_W / 2;           // the blank line is centred on the page
  var LINE_TOP_FROM_TOP = 385.0;       // y of the blank line, measured from the top edge
  var BASELINE_GAP = 5.5;              // name baseline sits this far above the line
  var BASELINE_FROM_TOP = LINE_TOP_FROM_TOP - BASELINE_GAP;
  var MAX_NAME_WIDTH = 500;            // line is ~539pt wide; keep a margin either side
  var MAX_FONT = 42;
  var MIN_FONT = 16;
  var NAME_COLOR = rgb(0.361, 0.071, 0.125); // #5c1220, matches the "Certificate" lettering

  var MAX_LEN = 60;
  var NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;
  var DEVANAGARI_RE = /[ऀ-ॿ]/;

  var ASSETS = {
    template: "assets/certificate-template.jpg",
    latin: "assets/fonts/playfair-display-latin-600-italic.woff",
    deva: "assets/fonts/noto-serif-devanagari-devanagari-600-normal.woff"
  };

  // ---- DOM ----------------------------------------------------------------
  var form = document.getElementById("cert-form");
  var input = document.getElementById("name");
  var errorEl = document.getElementById("error");
  var statusEl = document.getElementById("status");
  var submit = document.getElementById("submit");
  var submitLabel = document.getElementById("submit-label");
  var previewName = document.getElementById("preview-name");
  var previewBox = document.getElementById("cert-preview");

  var DEFAULT_LABEL = submitLabel.textContent;
  var SAMPLE = "Your Name";

  // ---- Helpers ------------------------------------------------------------
  var bytesCache = {};
  function loadBytes(url) {
    if (!bytesCache[url]) {
      bytesCache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error("Could not load " + url);
        return r.arrayBuffer();
      });
    }
    return bytesCache[url];
  }

  /** Collapse whitespace; if the user typed all-lower or all-upper, Title Case it. */
  function normalise(raw) {
    var s = raw.replace(/\s+/g, " ").trim();
    var hasLower = s !== s.toUpperCase();
    var hasUpper = s !== s.toLowerCase();
    if (hasLower !== hasUpper) {
      s = s.toLowerCase().replace(/(^|[\s'’.-])(\p{L})/gu, function (_, a, b) {
        return a + b.toUpperCase();
      });
    }
    return s;
  }

  function validate(value) {
    if (!value) return "Please enter your full name.";
    if (value.length < 2) return "That looks too short. Please enter your full name.";
    if (value.length > MAX_LEN) return "Please keep the name under " + MAX_LEN + " characters.";
    if (!NAME_RE.test(value)) return "Please use letters only (spaces, full stops, hyphens and apostrophes are fine).";
    return "";
  }

  /**
   * Split text into runs by script. Devanagari letters use the Devanagari font;
   * everything else (spaces, full stops, Latin letters) uses the Latin font,
   * because the Devanagari subset has no space glyph.
   */
  function splitRuns(text) {
    var runs = [];
    var chars = Array.from(text);
    for (var i = 0; i < chars.length; i++) {
      var key = DEVANAGARI_RE.test(chars[i]) ? "deva" : "latin";
      var last = runs[runs.length - 1];
      if (last && last.key === key) last.text += chars[i];
      else runs.push({ key: key, text: chars[i] });
    }
    return runs;
  }

  function keysFor(runs) {
    var keys = [];
    runs.forEach(function (r) { if (keys.indexOf(r.key) < 0) keys.push(r.key); });
    return keys;
  }

  function widthOf(fonts, runs, size) {
    return runs.reduce(function (sum, r) { return sum + fonts[r.key].widthOfTextAtSize(r.text, size); }, 0);
  }

  // A scratch document used purely to measure text width with the real fonts,
  // so the on-screen preview and the final PDF always fit identically.
  var measurer = null;
  function getMeasurer() {
    if (!measurer) {
      measurer = PDFDocument.create().then(function (doc) {
        doc.registerFontkit(fontkit);
        return doc;
      });
    }
    return measurer;
  }

  var measureFonts = {};
  function getMeasureFont(key) {
    if (!measureFonts[key]) {
      measureFonts[key] = Promise.all([getMeasurer(), loadBytes(ASSETS[key])]).then(function (r) {
        return r[0].embedFont(r[1], { subset: false });
      });
    }
    return measureFonts[key];
  }

  function getMeasureFonts(runs) {
    var keys = keysFor(runs);
    return Promise.all(keys.map(getMeasureFont)).then(function (list) {
      var map = {};
      keys.forEach(function (k, i) { map[k] = list[i]; });
      return map;
    });
  }

  /** Largest font size (pt) at which the runs fit the line, or null if a glyph is missing. */
  function fitSize(fonts, runs) {
    var size = MAX_FONT;
    try {
      while (size > MIN_FONT && widthOf(fonts, runs, size) > MAX_NAME_WIDTH) size -= 0.5;
      return { size: size, width: widthOf(fonts, runs, size) };
    } catch (e) {
      return null; // character not available in the embedded font
    }
  }

  // ---- Live preview -------------------------------------------------------
  previewBox.style.setProperty("--base", String(BASELINE_FROM_TOP / PAGE_H));

  var previewToken = 0;
  function updatePreview() {
    var text = normalise(input.value);
    var shown = text || SAMPLE;
    var token = ++previewToken;
    var runs = splitRuns(shown);

    getMeasureFonts(runs).then(function (fonts) {
      if (token !== previewToken) return;
      var fit = fitSize(fonts, runs);
      previewName.textContent = text ? shown : "";
      previewName.classList.toggle("is-deva", DEVANAGARI_RE.test(shown));
      if (fit) previewBox.style.setProperty("--pt", String(fit.size));
    }).catch(function () { /* preview is decorative; the submit path reports real errors */ });
  }

  // ---- PDF ----------------------------------------------------------------
  function buildPdf(name) {
    var runs = splitRuns(name);
    var keys = keysFor(runs);
    var loads = [loadBytes(ASSETS.template)].concat(keys.map(function (k) { return loadBytes(ASSETS[k]); }));

    return Promise.all(loads).then(function (res) {
      return PDFDocument.create().then(function (doc) {
        doc.registerFontkit(fontkit);
        doc.setTitle("Certificate of Appreciation - " + name);
        doc.setAuthor("FTS Mahila Samiti, Bangalore");
        doc.setSubject("Sanatan Ke Rang - Certificate of Appreciation");
        doc.setCreator("FTS Mahila Samiti, Bangalore");
        doc.setProducer("FTS Mahila Samiti certificate generator");

        var embeds = [doc.embedJpg(res[0])].concat(keys.map(function (k, i) {
          return doc.embedFont(res[i + 1], { subset: true });
        }));
        return Promise.all(embeds).then(function (assets) {
          var image = assets[0];
          var fonts = {};
          keys.forEach(function (k, i) { fonts[k] = assets[i + 1]; });

          var fit = fitSize(fonts, runs);
          if (!fit) {
            var err = new Error("unsupported");
            err.code = "UNSUPPORTED";
            throw err;
          }
          var page = doc.addPage([PAGE_W, PAGE_H]);
          page.drawImage(image, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });

          var x = CENTER_X - fit.width / 2;
          runs.forEach(function (r) {
            page.drawText(r.text, {
              x: x,
              y: PAGE_H - BASELINE_FROM_TOP,
              size: fit.size,
              font: fonts[r.key],
              color: NAME_COLOR
            });
            x += fonts[r.key].widthOfTextAtSize(r.text, fit.size);
          });
          return doc.save();
        });
      });
    });
  }

  function safeFileName(name) {
    var base = name.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
    return "FTS-Mahila-Certificate-" + (base || "Participant") + ".pdf";
  }

  function download(bytes, filename) {
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  // ---- UI wiring ----------------------------------------------------------
  function setError(msg) {
    errorEl.hidden = !msg;
    errorEl.textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function setBusy(busy) {
    submit.disabled = busy;
    submit.setAttribute("aria-busy", busy ? "true" : "false");
    submitLabel.textContent = busy ? "Preparing your certificate…" : DEFAULT_LABEL;
  }

  input.addEventListener("input", function () {
    if (input.getAttribute("aria-invalid") === "true") setError("");
    statusEl.textContent = "";
    updatePreview();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.textContent = "";
    var name = normalise(input.value);
    var problem = validate(name);
    if (problem) {
      setError(problem);
      input.focus();
      return;
    }
    setError("");
    input.value = name;
    updatePreview();
    setBusy(true);

    buildPdf(name).then(function (bytes) {
      download(bytes, safeFileName(name));
      statusEl.textContent = "Done. Your certificate has been downloaded.";
    }).catch(function (err) {
      if (err && err.code === "UNSUPPORTED") {
        setError("Some characters in that name can't be printed. Please use English or Hindi (Devanagari) letters.");
        input.focus();
      } else {
        statusEl.textContent = "";
        setError("Something went wrong while creating the certificate. Please check your connection and try again.");
      }
    }).then(function () { setBusy(false); });
  });

  // Warm the fonts so the first preview/download is instant.
  updatePreview();
  loadBytes(ASSETS.template);
})();

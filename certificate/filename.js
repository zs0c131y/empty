/*
 * Builds the download filename: FTS_Sangam_Certificate_<Entered_Name>.pdf
 *
 * The filename is always English (ASCII). Devanagari names are transliterated
 * into simple, everyday Latin spelling (e.g. अनीता जैन -> Anita_Jain), because
 * long vowels and diacritics would look odd in a filename.
 */
(function (root) {
  "use strict";

  var CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
    "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "ळ": "l", "व": "v",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
    // precomposed nukta forms
    "क़": "k", "ख़": "kh", "ग़": "g", "ज़": "z",
    "ड़": "r", "ढ़": "rh", "फ़": "f", "य़": "y"
  };
  var VOWELS = {
    "अ": "a", "आ": "a", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u", "ऋ": "ri",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o"
  };
  var MATRAS = {
    "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "e"
  };
  var VIRAMA = "्";
  var NUKTA = "़";
  var ANUSVARA = { "ं": "n", "ँ": "n", "ः": "h" };

  function isDevanagari(ch) {
    return ch >= "ऀ" && ch <= "ॿ";
  }

  /** Devanagari -> simple Latin. Non-Devanagari characters pass through unchanged. */
  function transliterate(text) {
    // ज्ञ is pronounced "gy" and behaves as a single consonant; सिंह is conventionally "Singh".
    var s = text.replace(/सिंह/g, "singh").replace(/ज्ञ/g, "\uE000");
    var out = "";
    var pendingA = false;   // a consonant was written and has not yet received a vowel
    var conjunct = false;   // the pending consonant ends a cluster (e.g. the "dr" of इंद्र)
    var afterVirama = false;

    // Word ends: the final inherent "a" is silent (कमल -> kamal) unless it follows a
    // cluster, where it is pronounced (मित्र -> mitra).
    function endWord() {
      if (pendingA && conjunct) out += "a";
      pendingA = false; conjunct = false; afterVirama = false;
    }

    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);

      if (CONSONANTS[ch] !== undefined || ch === "\uE000") {
        if (pendingA) out += "a";
        out += ch === "\uE000" ? "gy" : CONSONANTS[ch];
        conjunct = afterVirama;
        afterVirama = false;
        pendingA = true;
      } else if (MATRAS[ch] !== undefined) {
        out += MATRAS[ch];
        pendingA = false; conjunct = false; afterVirama = false;
      } else if (ch === VIRAMA) {
        pendingA = false; afterVirama = true;
      } else if (ch === NUKTA) {
        // already folded into the base consonant
      } else if (VOWELS[ch] !== undefined) {
        if (pendingA) out += "a";
        out += VOWELS[ch];
        pendingA = false; conjunct = false; afterVirama = false;
      } else if (ANUSVARA[ch] !== undefined) {
        if (pendingA) out += "a";
        out += ANUSVARA[ch];
        pendingA = false; conjunct = false; afterVirama = false;
      } else if (isDevanagari(ch)) {
        pendingA = false; conjunct = false; afterVirama = false; // digits, danda, etc.
      } else {
        endWord();
        out += ch;
      }
    }
    endWord();
    return out;
  }

  function fileName(name) {
    var latin = transliterate(String(name))
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")      // strip accents (é -> e)
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim();
    var words = latin ? latin.split(/\s+/) : [];
    var cased = words.map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
    return "FTS_Sangam_Certificate_" + (cased.length ? cased.join("_") : "Participant") + ".pdf";
  }

  var api = { transliterate: transliterate, fileName: fileName };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FtsFilename = api;
})(typeof window !== "undefined" ? window : this);

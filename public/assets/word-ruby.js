/* 词块式注音渲染器：WRT.render(tokens)
   tokens: [[词语表面, 假名读法], ...]；标点记号只显示符号本身。
   罗马音由假名自动转换（含拗音、促音、长音符号ー）。 */
(function () {
  "use strict";
  var BASE = {
    "あ":"a","い":"i","う":"u","え":"e","お":"o",
    "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
    "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
    "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
    "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
    "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
    "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
    "や":"ya","ゆ":"yu","よ":"yo",
    "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
    "わ":"wa","ゐ":"i","ゑ":"e","を":"wo","ん":"n",
    "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
    "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
    "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do",
    "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
    "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
    "ぁ":"a","ぃ":"i","ぅ":"u","ぇ":"e","ぉ":"o","ゔ":"vu"
  };
  var DIGRAPH = {
    "きゃ":"kya","きゅ":"kyu","きょ":"kyo","きぇ":"kye",
    "しゃ":"sha","しゅ":"shu","しょ":"sho","しぇ":"she",
    "ちゃ":"cha","ちゅ":"chu","ちょ":"cho","ちぇ":"che",
    "にゃ":"nya","にゅ":"nyu","にょ":"nyo",
    "ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo",
    "みゃ":"mya","みゅ":"myu","みょ":"myo",
    "りゃ":"rya","りゅ":"ryu","りょ":"ryo",
    "ぎゃ":"gya","ぎゅ":"gyu","ぎょ":"gyo",
    "じゃ":"ja","じゅ":"ju","じょ":"jo","じぇ":"je",
    "びゃ":"bya","びゅ":"byu","びょ":"byo",
    "ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo",
    "ふぁ":"fa","ふぃ":"fi","ふぇ":"fe","ふぉ":"fo",
    "うぃ":"wi","うぇ":"we","てぃ":"ti","でぃ":"di","とぅ":"tu","どう":"dou"
  };
  var PUNCT_RE = /^[、。！？…‥「」『』（）()・：；，,.\-—\s]+$/;

  function toHira(s) {
    var r = "", i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      r += (c >= 0x30a1 && c <= 0x30f6) ? String.fromCharCode(c - 0x60) : s.charAt(i);
    }
    return r;
  }

  function romaji(text) {
    if (!text) return "";
    var t = toHira(String(text)), out = "", i = 0, two, ch, nextR, prevR = "";
    // 整块仅一个假名时：は/へ 为助词，分别读 wa/e（如「…」は）
    if (t === "は") return "wa";
    if (t === "へ") return "e";
    while (i < t.length) {
      two = t.substr(i, 2);
      if (DIGRAPH[two]) { out += DIGRAPH[two]; prevR = DIGRAPH[two]; i += 2; continue; }
      ch = t.charAt(i);
      if (ch === "っ") {
        if (i + 1 >= t.length) { i++; continue; }
        two = t.substr(i + 1, 2);
        nextR = DIGRAPH[two] || BASE[t.charAt(i + 1)] || t.charAt(i + 1);
        if (/^[kstpgbdzjcfhwr]/.test(nextR)) {
          var c0 = (nextR.charAt(0) === "c" ? "t" : nextR.charAt(0));
          out += c0; prevR = c0;
        }
        i++; continue;
      }
      if (ch === "ー") {
        var m = out.match(/[aiueo][^aiueo]*$/);
        if (m) { out += m[0].charAt(0); prevR = m[0].charAt(0); }
        i++; continue;
      }
      var base = BASE[ch] || ch;
      // 助词 は/へ 在非词首、且前一音节非同形时读 wa/e
      // 如 では→dewa、漫画は→mangawa、パクさんは→pakusanwa；
      // 词首 は/へ（如 始める/へた）及 はは(母) 等保持 ha/he
      if (ch === "は" && i > 0 && prevR !== "ha") base = "wa";
      else if (ch === "へ" && i > 0 && prevR !== "he") base = "e";
      out += base; prevR = base; i++;
    }
    return out;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render(tokens) {
    if (!tokens || !tokens.length) return "";
    return tokens.map(function (tk) {
      var s = tk[0], k = tk[1] || "";
      if (PUNCT_RE.test(s)) {
        return '<span class="wtok wtok-punct"><span class="w-furi"></span><span class="w-word">' + esc(s) + '</span><span class="w-roma"></span></span>';
      }
      var hasKanji = /[\u3400-\u9faf]/.test(s);
      var furi = (hasKanji && k && k !== s) ? k : "";
      return '<span class="wtok"><span class="w-furi">' + esc(furi) + '</span><span class="w-word">' + esc(s) + '</span><span class="w-roma">' + esc(romaji(k || s)) + '</span></span>';
    }).join("");
  }

  window.WRT = { render: render, romaji: romaji };
})();

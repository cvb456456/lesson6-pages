(function () {
  function speechKey(text) {
    let value = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, "0");
  }

  function splitMixedNarration(segment) {
    if (segment.lang !== "zh") return [segment];

    const quotedJapanese = /([「『])(.*?)([」』])/g;
    const japaneseKana = /[\u3040-\u30ff]/;
    const kanji = /[\u3400-\u9fff]/;
    const likelyJapaneseQuote = (innerText, fullText, matchIndex) => {
      if (japaneseKana.test(innerText)) return true;
      if (!kanji.test(innerText)) return false;
      const windowText = fullText.slice(Math.max(0, matchIndex - 12), matchIndex + innerText.length + 24);
      return /意思是|读作|词块|搭配|句型|语法|对象|焦点|换成|核心|表示|中的|需要注意/.test(windowText);
    };
    const parts = [];
    let cursor = 0;
    let match;

    while ((match = quotedJapanese.exec(segment.text)) !== null) {
      const innerText = match[2];
      if (!likelyJapaneseQuote(innerText, segment.text, match.index)) continue;

      if (match.index > cursor) {
        parts.push({
          ...segment,
          text: segment.text.slice(cursor, match.index),
          display: segment.display || segment.text,
        });
      }
      parts.push({
        ...segment,
        lang: "ja",
        text: innerText,
        display: segment.display || segment.text,
      });
      cursor = match.index + match[0].length;
    }

    if (!parts.length) return [segment];
    if (cursor < segment.text.length) {
      parts.push({
        ...segment,
        text: segment.text.slice(cursor),
        display: segment.display || segment.text,
      });
    }
    return parts.reduce((spokenParts, part) => {
      if (!part.text.trim()) return spokenParts;
      if (!/[\p{L}\p{N}]/u.test(part.text) && spokenParts.length) {
        spokenParts[spokenParts.length - 1].text += part.text;
        return spokenParts;
      }
      spokenParts.push(part);
      return spokenParts;
    }, []);
  }

  function expandMixedNarration(lessons) {
    return lessons.map(lesson => ({
      ...lesson,
      segments: lesson.segments.flatMap(splitMixedNarration),
    }));
  }

  function mount(options) {
    const target = document.getElementById(options.target);
    if (!target || !options.lessons.length) return null;

    const lessons = expandMixedNarration(options.lessons);
    const bases = {
      ja: options.jaBase || "audio/jp-nanami",
      zh: options.zhBase || "audio/zh-xiaoxiao",
    };
    let sentenceIndex = 0;
    let segmentIndex = 0;
    const audio = new Audio();
    let audioReady = false;
    let playing = false;
    let speed = 1;
    let loop = "all";
    let progressFrame = 0;

    target.innerHTML = `
      <div class="audio-study-player">
        <div class="audio-study-head">
          <div>
            <div class="audio-study-kicker">Hands-free intensive study</div>
            <div class="audio-study-title">听力精读模式</div>
          </div>
          <div class="audio-study-status" data-audio-status>可从任意句开始</div>
        </div>
        <div class="audio-study-current">
          <b data-audio-label>准备播放</b>
          <p data-audio-text>选择句子后，日语原句和中文文法讲解会依次播放。</p>
        </div>
        <div class="audio-study-progress"><i data-audio-progress></i></div>
        <div class="audio-study-controls">
          <button class="audio-control" type="button" data-audio-prev title="上一句">上一句</button>
          <button class="audio-control primary" type="button" data-audio-play>开始播放</button>
          <button class="audio-control" type="button" data-audio-next title="下一句">下一句</button>
          <select class="audio-study-select" data-audio-sentence aria-label="选择起始句">
            ${lessons.map((lesson, index) => `<option value="${index}">第${index + 1}句 · ${lesson.title}</option>`).join("")}
          </select>
          <select class="audio-study-select" data-audio-speed aria-label="播放速度">
            <option value=".75">0.75×</option>
            <option value="1" selected>1.0×</option>
            <option value="1.15">1.15×</option>
            <option value="1.3">1.3×</option>
            <option value="1.5">1.5×</option>
          </select>
          <select class="audio-study-select" data-audio-loop aria-label="循环模式">
            <option value="all">循环全篇</option>
            <option value="one">循环本句</option>
            <option value="off">播完停止</option>
          </select>
        </div>
        <div class="audio-sentence-strip">
          ${lessons.map((_, index) => `<button class="audio-sentence-chip" type="button" data-audio-jump="${index}">${index + 1}</button>`).join("")}
        </div>
      </div>
      <div class="audio-narration-manifest">
        ${lessons.flatMap(lesson => lesson.segments).map(segment =>
          `<span data-narration-${segment.lang}="${encodeURIComponent(segment.text)}"></span>`
        ).join("")}
      </div>
      <div class="audio-study-mini" data-audio-mini>
        <span class="audio-study-mini-text" data-audio-mini-text>听力精读</span>
        <button class="audio-mini-btn" type="button" data-audio-mini-prev title="上一句">◀</button>
        <button class="audio-mini-btn play" type="button" data-audio-mini-play title="暂停或继续">Ⅱ</button>
        <button class="audio-mini-btn" type="button" data-audio-mini-next title="下一句">▶</button>
      </div>`;

    const playButton = target.querySelector("[data-audio-play]");
    const sentenceSelect = target.querySelector("[data-audio-sentence]");
    const status = target.querySelector("[data-audio-status]");
    const label = target.querySelector("[data-audio-label]");
    const text = target.querySelector("[data-audio-text]");
    const progress = target.querySelector("[data-audio-progress]");
    const mini = target.querySelector("[data-audio-mini]");
    const miniText = target.querySelector("[data-audio-mini-text]");
    const miniPlay = target.querySelector("[data-audio-mini-play]");

    function currentLesson() {
      return lessons[sentenceIndex];
    }

    function currentSegment() {
      return currentLesson().segments[segmentIndex];
    }

    function progressPercent() {
      const total = currentLesson().segments.length;
      const withinSegment = audioReady && Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.min(1, Math.max(0, audio.currentTime / audio.duration))
        : 0;
      return ((segmentIndex + withinSegment) / total) * 100;
    }

    function paintProgress() {
      progress.style.width = `${progressPercent()}%`;
    }

    function stopProgressAnimation() {
      if (!progressFrame) return;
      window.cancelAnimationFrame(progressFrame);
      progressFrame = 0;
    }

    function startProgressAnimation() {
      stopProgressAnimation();
      const tick = () => {
        paintProgress();
        if (playing && audioReady && !audio.paused) {
          progressFrame = window.requestAnimationFrame(tick);
        } else {
          progressFrame = 0;
        }
      };
      progressFrame = window.requestAnimationFrame(tick);
    }

    function updateUi() {
      const lesson = currentLesson();
      const segment = currentSegment();
      sentenceSelect.value = String(sentenceIndex);
      status.textContent = `第 ${sentenceIndex + 1}/${lessons.length} 句 · 讲解 ${segmentIndex + 1}/${lesson.segments.length}`;
      label.textContent = segment.label || (segment.lang === "ja" ? "日语" : "讲解");
      text.textContent = segment.display || segment.text;
      paintProgress();
      playButton.textContent = playing ? "暂停" : audioReady && audio.currentTime > 0 ? "继续播放" : "开始播放";
      mini.classList.toggle("show", playing || (audioReady && audio.currentTime > 0));
      miniText.textContent = `第${sentenceIndex + 1}句 · ${segment.label || "讲解"}`;
      miniPlay.textContent = playing ? "Ⅱ" : "▶";
      target.querySelectorAll("[data-audio-jump]").forEach(button => {
        button.classList.toggle("active", Number(button.dataset.audioJump) === sentenceIndex);
      });
      document.querySelectorAll("[data-listen-lesson]").forEach(button => {
        button.classList.toggle("active", Number(button.dataset.listenLesson) === sentenceIndex && playing);
      });
    }

    function stopAudio() {
      stopProgressAnimation();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      audio.removeAttribute("src");
      audio.load();
      audioReady = false;
    }

    function pause() {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (audioReady) audio.pause();
      playing = false;
      stopProgressAnimation();
      paintProgress();
      updateUi();
    }

    function stop() {
      stopAudio();
      playing = false;
      segmentIndex = 0;
      updateUi();
    }

    function moveAfterSentence() {
      if (loop === "one") {
        segmentIndex = 0;
        return true;
      }
      if (sentenceIndex < lessons.length - 1) {
        sentenceIndex += 1;
        segmentIndex = 0;
        return true;
      }
      if (loop === "all") {
        sentenceIndex = 0;
        segmentIndex = 0;
        return true;
      }
      return false;
    }

    function advance() {
      if (segmentIndex < currentLesson().segments.length - 1) {
        segmentIndex += 1;
        playCurrent();
        return;
      }
      if (moveAfterSentence()) {
        playCurrent();
        return;
      }
      playing = false;
      segmentIndex = currentLesson().segments.length - 1;
      updateUi();
      progress.style.width = "100%";
    }

    function playCurrent() {
      stopAudio();
      document.dispatchEvent(new CustomEvent("audio-lesson-start"));
      const segment = currentSegment();
      audio.src = `${bases[segment.lang]}/${speechKey(segment.text)}.mp3`;
      audioReady = true;
      audio.playbackRate = speed;
      audio.preload = "auto";
      playing = true;
      audio.onended = advance;
      audio.onloadedmetadata = startProgressAnimation;
      audio.onerror = () => {
        stopProgressAnimation();
        playing = false;
        audioReady = false;
        label.textContent = "音频缺失";
        text.textContent = "该段音频还没有生成，播放已暂停，不会自动跳过。";
        updateUi();
      };
      updateUi();
      audio.play().then(startProgressAnimation).catch(() => {
        stopProgressAnimation();
        playing = false;
        audioReady = false;
        label.textContent = "音频无法播放";
        text.textContent = "浏览器暂时无法播放这一段音频，播放已暂停。";
        updateUi();
      });
    }

    function playSentence(index) {
      sentenceIndex = Math.max(0, Math.min(lessons.length - 1, index));
      segmentIndex = 0;
      playCurrent();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    playButton.addEventListener("click", () => {
      if (playing) {
        pause();
      } else if (audioReady && audio.currentTime > 0 && audio.paused) {
        playing = true;
        audio.playbackRate = speed;
        audio.play().then(startProgressAnimation);
        updateUi();
      } else {
        playCurrent();
      }
    });

    target.querySelector("[data-audio-prev]").addEventListener("click", () => {
      sentenceIndex = (sentenceIndex - 1 + lessons.length) % lessons.length;
      segmentIndex = 0;
      playCurrent();
    });
    target.querySelector("[data-audio-next]").addEventListener("click", () => {
      sentenceIndex = (sentenceIndex + 1) % lessons.length;
      segmentIndex = 0;
      playCurrent();
    });
    target.querySelector("[data-audio-mini-prev]").addEventListener("click", () => {
      sentenceIndex = (sentenceIndex - 1 + lessons.length) % lessons.length;
      segmentIndex = 0;
      playCurrent();
    });
    target.querySelector("[data-audio-mini-next]").addEventListener("click", () => {
      sentenceIndex = (sentenceIndex + 1) % lessons.length;
      segmentIndex = 0;
      playCurrent();
    });
    miniPlay.addEventListener("click", () => playButton.click());
    sentenceSelect.addEventListener("change", () => playSentence(Number(sentenceSelect.value)));
    target.querySelector("[data-audio-speed]").addEventListener("change", event => {
      speed = Number(event.target.value);
      if (audioReady) audio.playbackRate = speed;
    });
    target.querySelector("[data-audio-loop]").addEventListener("change", event => {
      loop = event.target.value;
    });
    target.querySelectorAll("[data-audio-jump]").forEach(button => {
      button.addEventListener("click", () => playSentence(Number(button.dataset.audioJump)));
    });

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-listen-lesson]");
      if (!button) return;
      playSentence(Number(button.dataset.listenLesson));
    });
    document.addEventListener("single-speech-start", pause);

    updateUi();
    return { playSentence, pause, stop };
  }

  window.AudioLessonPlayer = { mount };
})();

/* New game. Original learning flow, scenes, physics arenas and progress model. */
(() => {
  "use strict";
  const el = (id) => document.getElementById(id),
    data = SOLAR,
    D = SpaceDraw;
  const { Engine, Bodies, Body, Composite, Events, Vector } = Matter;
  const W = 1280,
    H = 620,
    anchor = { x: 178, y: 419 },
    groundY = 552,
    storeKey = "solar-jorge-v1";
  const ctx = el("world").getContext("2d"),
    diagramCtx = el("diagram").getContext("2d");
  const allQuestions = data.levels.flatMap((l, i) =>
    l.questions.map((q) => ({ ...q, levelIndex: i })),
  );
  const empty = () => ({
    version: 1,
    missions: {},
    facts: {},
    shots: 0,
    step: 0,
    sessions: 0,
    settings: { sound: true, spanish: true },
    history: [],
    active: null,
  });
  let progress = empty(),
    saveOkay = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
    if (saved?.version === 1 && saved.missions && saved.facts) {
      progress = {
        ...empty(),
        ...saved,
        settings: { ...empty().settings, ...saved.settings },
      };
    }
  } catch {
    saveOkay = false;
  }
  let voiceManifest = window.SOLAR_VOICE || null,
    media = window.SOLAR_MEDIA || {},
    speechAudio = null,
    speechToken = 0,
    audioCtx;
  let levelIndex = 0,
    cardIndex = 0,
    lessonReturn = false,
    lessonPaused = false,
    lessonTime = 0,
    lessonBase = 0;
  let mode = "home",
    session = null,
    question = null,
    choices = [],
    engine = null,
    bird = null,
    selectedBird = 2,
    dragging = false,
    dragPoint = { ...anchor },
    flying = false,
    flightAge = 0,
    powerUsed = false,
    roundDone = false,
    assisted = false,
    highlight = -1;
  let pigs = [],
    blocks = [],
    particles = [],
    trails = [],
    stars = [],
    cameraShake = 0,
    toastTimer,
    frame = 0,
    lastTime = 0,
    physicsTime = 0,
    hoverTarget = -1;
  let viewHeight = H, cameraTop = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shuffle = (rows) =>
    rows
      .map((v) => ({ v, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.v);
  const fact = (id) =>
    progress.facts[id] || {
      right: 0,
      independent: 0,
      assisted: 0,
      mistakes: 0,
      last: 0,
      due: 0,
      lastSession: -1,
    };
  const mastery = (id) => fact(id).independent >= 2;
  const translate = (text) =>
    data.dictionary[text] ||
    text
      .replace(/hours/g, "horas")
      .replace(/days/g, "días")
      .replace(/^Only /, "Solo ")
      .replace(/^The /, "");
  function save() {
    try {
      localStorage.setItem(storeKey, JSON.stringify(progress));
      saveOkay = true;
    } catch {
      saveOkay = false;
    }
  }
  function toast(text) {
    clearTimeout(toastTimer);
    el("toast").textContent = text;
    el("toast").hidden = false;
    toastTimer = setTimeout(() => (el("toast").hidden = true), 3600);
  }
  function sfx(type) {
    if (!progress.settings.sound) return;
    try {
      audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume();
      const tones =
        type === "success"
          ? [523, 659, 784]
          : type === "launch"
            ? [250, 440]
            : type === "power"
              ? [220, 330, 660]
              : [180];
      tones.forEach((frequency, i) => {
        const oscillator = audioCtx.createOscillator(),
          gain = audioCtx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          frequency,
          audioCtx.currentTime + i * 0.09,
        );
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(
          0.09,
          audioCtx.currentTime + i * 0.09 + 0.01,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + i * 0.09 + 0.19,
        );
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime + i * 0.09);
        oscillator.stop(audioCtx.currentTime + i * 0.09 + 0.2);
      });
    } catch {}
  }
  function stopSpeech() {
    speechToken++;
    if (speechAudio) {
      speechAudio.pause();
      speechAudio = null;
    }
    window.speechSynthesis?.cancel();
  }
  async function speak(text) {
    stopSpeech();
    if (!progress.settings.sound) return;
    const token = speechToken;
    const file = voiceManifest?.ready && voiceManifest.clips[text];
    if (file) {
      speechAudio = new Audio("assets/voice/" + file);
      speechAudio.volume = 0.9;
      try {
        await speechAudio.play();
        return;
      } catch {
        if (token !== speechToken) return;
      }
    }
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.79;
    utterance.pitch = 1.06;
    const voices = speechSynthesis.getVoices();
    utterance.voice =
      voices.find(
        (v) =>
          v.lang === "en-GB" &&
          /female|serena|susan|kate|shelley/i.test(v.name),
      ) ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;
    speechSynthesis.speak(utterance);
  }
  if (location.protocol !== 'file:') fetch("assets/voice/manifest.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => (voiceManifest = v))
    .catch(() => {});
  if (location.protocol !== 'file:') fetch("assets/media.json")
    .then((r) => (r.ok ? r.json() : {}))
    .then((v) => (media = v || {}))
    .catch(() => {});
  function updateSettings() {
    el('concept-video').muted = !progress.settings.sound;
    document.body.classList.toggle("no-es", !progress.settings.spanish);
    el("translate").textContent = progress.settings.spanish ? "EN + ES" : "EN";
    el("translate").setAttribute(
      "aria-pressed",
      String(progress.settings.spanish),
    );
    el("sound").textContent = progress.settings.sound ? "♫" : "♪";
    el("sound").setAttribute("aria-pressed", String(progress.settings.sound));
    el("sound").setAttribute(
      "aria-label",
      progress.settings.sound
        ? "Sound on. Tap to turn off."
        : "Sound off. Tap to turn on.",
    );
    fitArena();
  }
  function renderMap() {
    const completed = data.levels.filter(
      (l) => progress.missions[l.id]?.complete,
    ).length;
    el("complete-count").textContent = completed + " / " + data.levels.length;
    el("progress-fill").style.width =
      (completed / data.levels.length) * 100 + "%";
    const recommended = data.levels.findIndex(
      (l) => !progress.missions[l.id]?.complete,
    );
    el("continue").innerHTML =
      (completed === 12 ? "Fly again!" : "Let’s go!") + " <span>↗</span>";
    el("mission-map").replaceChildren();
    data.levels.forEach((l, i) => {
      const done = !!progress.missions[l.id]?.complete,
        found = l.questions.filter((q) => fact(q.id).right > 0).length;
      const card = document.createElement("button");
      card.className =
        "mission-card" +
        (done ? " completed" : "") +
        (i === recommended ? " recommended" : "");
      card.setAttribute(
        "aria-label",
        `Mission ${i + 1}: ${l.title}. ${done ? "Completed." : i === recommended ? "Your next adventure." : "Ready to explore."}`,
      );
      card.innerHTML = `<div class="mission-top"><span class="mission-index">MISSION ${String(i + 1).padStart(2, "0")}</span><span class="mission-icon sprite bird-${l.bird}" aria-hidden="true"></span></div><h3>${l.title}</h3><p class="es">${l.es}</p><div class="mission-bottom"><span class="mission-state">${done ? "✓ Explored" : i === recommended ? "✦ Start here" : "Ready to explore"}</span><span class="dots">${l.questions.map((q, n) => `<i class="${fact(q.id).right ? "filled" : ""}"></i>`).join("")}</span><span class="mission-arrow">↗</span></div>`;
      card.onclick = () => startLevel(i);
      el("mission-map").append(card);
    });
    const found = allQuestions.filter((q) => fact(q.id).right > 0).length;
    el("knowledge-count").textContent =
      found +
      " / " +
      allQuestions.length +
      " discoveries · " +
      allQuestions.filter((q) => mastery(q.id)).length +
      " confident answers";
  }
  function home() {
    document.body.classList.remove('playing');
    stopSpeech();
    mode = "home";
    dragging = false;
    flying = false;
    session = null;
    el("play").hidden = true;
    el("home").hidden = false;
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    renderMap();
    window.scrollTo(0, 0);
  }
  function startLevel(index, options = {}) {
    document.body.classList.add('playing');
    stopSpeech();
    levelIndex = Math.max(0, Math.min(index, data.levels.length - 1));
    const l = data.levels[levelIndex];
    selectedBird = l.bird;
    progress.sessions++;
    session = {
      id: progress.sessions,
      kind: options.kind || "mission",
      level: levelIndex,
      queue: options.questions || l.questions.map((q) => q.id),
      done: [],
      errors: [],
      round: 0,
      repeat: [],
      started: Date.now(),
    };
    if (
      progress.active?.level === levelIndex &&
      progress.active?.queue?.length &&
      session.kind === "mission" &&
      !options.fresh
    ) {
      session = { ...progress.active, id: progress.sessions };
      session.queue = session.queue.filter((id) =>
        allQuestions.some((q) => q.id === id),
      );
      if (!session.queue.length) session.queue = l.questions.map((q) => q.id);
    }
    progress.active = session.kind === "mission" ? session : null;
    save();
    mode = "lesson";
    el("home").hidden = true;
    el("play").hidden = false;
    el("play-title").textContent = l.title;
    el("mission-number").textContent =
      session.kind === "review"
        ? "A LITTLE PRACTICE"
        : "MISSION " + (levelIndex + 1) + " / 12";
    cardIndex = 0;
    lessonReturn = false;
    showLesson();
  }
  function showLesson() {
    const l = data.levels[levelIndex],
      card = l.cards[cardIndex];
    stopSpeech();
    el("lesson-title").textContent = l.title;
    el("lesson-en").textContent = card.en;
    el("lesson-es").textContent = card.es;
    el("lesson-kicker").textContent =
      "LEARN · " + (cardIndex + 1) + " / " + l.cards.length;
    el("lesson-dots").innerHTML = l.cards
      .map((c, i) => `<i class="${i === cardIndex ? "active" : ""}"></i>`)
      .join("");
    el("previous-card").disabled = cardIndex === 0;
    el("next-card").textContent =
      cardIndex === l.cards.length - 1
        ? lessonReturn
          ? "Back to flying ↗"
          : "Let’s fly! ↗"
        : "Next →";
    lessonTime = 0;
    lessonBase = performance.now();
    lessonPaused = reduced;
    el("pause-diagram").textContent = lessonPaused ? "▶ Play" : "Ⅱ Pause";
    el("diagram-time").value = 0;
    el("diagram").hidden = false;
    el("concept-video").hidden = true;
    el('pause-diagram').hidden = false;
    el('diagram-time').hidden = false;
    el('diagram-hint').hidden = false;
    el("concept-video").pause();
    const asset = media[l.id];
    el("watch-video").hidden = !asset;
    el("watch-video").textContent = "▷ Space movie";
    if (asset) {
      el("concept-video").src = asset.file;
      el("concept-video").poster = asset.poster || "";
    }
    if (!el("lesson").open) el("lesson").showModal();
    speak(card.en);
    D.scene(diagramCtx, card.scene, lessonTime);
  }
  function closeLesson() {
    stopSpeech();
    el("concept-video").pause();
    el("lesson").close();
    if (!session) {
      home();
      return;
    }
    mode = session.kind === "sandbox" ? "sandbox" : "play";
    if (!lessonReturn || !engine) loadRound();
    el("world").focus({ preventScroll: true });
  }
  function sessionQuestion() {
    return allQuestions.find((q) => q.id === session.queue[session.round]);
  }
  function buildWorld() {
    physicsTime = 0;
    engine = Engine.create({ gravity: { x: 0, y: 0.87 } });
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, groundY + 28, W * 3, 55, {
        isStatic: true,
        friction: 0.8,
        label: "ground",
      }),
      Bodies.rectangle(-80, 300, 80, 1000, { isStatic: true }),
      Bodies.rectangle(W + 160, 300, 80, 1000, { isStatic: true }),
    ]);
    pigs = [];
    blocks = [];
    particles = [];
    trails = [];
    stars = [];
    const positions = [
      { x: 638, y: 370 },
      { x: 864, y: 326 },
      { x: 1087, y: 380 },
    ];
    positions.forEach((p, i) => {
      const base = groundY - 5,
        top = p.y + 37;
      const legH = base - top;
      for (const side of [-1, 1]) {
        const b = Bodies.rectangle(p.x + side * 44, top + legH / 2, 19, legH, {
          density: 0.0018,
          friction: 0.7,
          restitution: 0.08,
          label: "wood",
        });
        b.visual = {
          material: (i + levelIndex) % 3 === 0 ? "glass" : "wood",
          color: side === 1 ? "#c78357" : "#d69665",
        };
        blocks.push(b);
        Composite.add(engine.world, b);
      }
      const roof = Bodies.rectangle(p.x, top - 5, 120, 18, {
        density: 0.0024,
        friction: 0.8,
        label: "wood",
      });
      roof.visual = { material: "wood", color: "#d9a47d" };
      blocks.push(roof);
      Composite.add(engine.world, roof);
      // Each outpost has a different stock of crates, struts and fragile glass.
      // The answer remains at the top, where the guided arc can always reach it.
      const layers = 1 + (levelIndex + i + session.round) % 3;
      for (let row = 0; row < layers; row++) {
        for (const side of [-1, 1]) {
          const crate = Bodies.rectangle(p.x + side * 18, base - 17 - row * 34, 31, 31, {
            density: .0014, friction: .6, restitution: .16, label: 'wood'
          });
          crate.visual = { material: (row + i + levelIndex) % 3 === 0 ? 'glass' : 'wood', color: '#b48a7b' };
          blocks.push(crate);
          Composite.add(engine.world, crate);
        }
      }
      const pig = Bodies.circle(p.x, p.y, 31, {
        label: "answer-pig",
        restitution: 0.2,
      });
      Body.setStatic(pig, true);
      pig.choice = i;
      pig.planet = (selectedBird + i + 2) % 8;
      pig.home = { ...p };
      pig.freed = false;
      pigs.push(pig);
      Composite.add(engine.world, pig);
    });
    Events.on(engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        if (!bird || roundDone) continue;
        const other =
          pair.bodyA === bird
            ? pair.bodyB
            : pair.bodyB === bird
              ? pair.bodyA
              : null;
        if (!other) continue;
        if (other.label === "answer-pig") hitAnswer(other.choice);
        else if (other.label === "wood" && flying) {
          const nearby = pigs.filter(
            (p) =>
              !p.freed &&
              Math.hypot(
                p.position.x - bird.position.x,
                p.position.y - bird.position.y,
              ) < 76,
          );
          if (nearby.length) hitAnswer(nearby[0].choice);
        }
      }
    });
    spawnBird();
  }
  function spawnBird() {
    if (!engine) return;
    if (bird) Composite.remove(engine.world, bird);
    engine.gravity.y = 0.87;
    bird = Bodies.circle(anchor.x, anchor.y, 24, {
      restitution: selectedBird === 4 ? 0.75 : 0.25,
      friction: 0.7,
      density: selectedBird === 4 ? 0.02 : 0.008,
      label: "planet-bird",
      frictionAir: 0.002,
    });
    Body.setStatic(bird, true);
    Composite.add(engine.world, bird);
    flying = false;
    flightAge = 0;
    powerUsed = false;
    dragging = false;
    dragPoint = { ...anchor };
    el("power").disabled = true;
    el("retry").disabled = roundDone;
    el("flight-tip").hidden = roundDone;
    updatePicker();
  }
  function updatePicker() {
    el("bird-picker").replaceChildren();
    data.planets.forEach((p) => {
      const b = document.createElement("button");
      b.className = "pick-bird" + (p.id === selectedBird ? " selected" : "");
      b.title = p.name + " · " + p.power;
      b.setAttribute("aria-label", p.name + " bird. " + p.power);
      b.setAttribute("aria-pressed", String(p.id === selectedBird));
      b.innerHTML = `<span class="sprite bird-${p.id}"></span>`;
      b.disabled = flying || roundDone;
      b.onclick = () => {
        selectedBird = p.id;
        spawnBird();
        speak(p.name);
      };
      el("bird-picker").append(b);
    });
    el("power").querySelector("span").textContent =
      data.planets[selectedBird].power;
  }
  function loadRound() {
    stopSpeech();
    roundDone = false;
    assisted = false;
    highlight = -1;
    hoverTarget = -1;
    el("feedback").hidden = true;
    el("next-round").hidden = true;
    el("retry").disabled = false;
    el("answer-buttons").replaceChildren();
    if (session.kind === "sandbox") {
      question = null;
      choices = ["Fly!", "Smash!", "Bounce!"].map((text, i) => ({
        text,
        index: i,
      }));
      el("question").textContent = "Try your planet powers. Just fly!";
      el("question-es").textContent =
        "Experimenta con el tirachinas y los ocho poderes.";
      el("round-count").textContent = "Free flight";
      el("round-progress").replaceChildren();
    } else {
      question = sessionQuestion();
      if (!question) {
        finishLevel();
        return;
      }
      choices = shuffle(
        question.choices.map((text, i) => ({ text, index: i })),
      );
      const l = data.levels[levelIndex];
      el("question").textContent = question.en;
      el("question-es").textContent = question.es;
      el("round-count").textContent =
        session.round + 1 + " / " + session.queue.length;
      el("round-progress").innerHTML = session.queue
        .map((id, i) => `<i class="${i < session.round ? "done" : ""}"></i>`)
        .join("");
      speak(question.en);
    }
    choices.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "answer-button";
      b.dataset.choice = i;
      b.setAttribute("aria-label", `Aim and fly towards ${c.text}`);
      b.innerHTML = `<span class="aim">↗</span>${c.text}<small class="es">${translate(c.text)}</small>`;
      b.onmouseenter = () => (hoverTarget = i);
      b.onmouseleave = () => (hoverTarget = -1);
      b.onclick = () => guidedShot(i);
      el("answer-buttons").append(b);
    });
    buildWorld();
    mode = session.kind === "sandbox" ? "sandbox" : "play";
    progress.active = session.kind === "mission" ? session : null;
    save();
    fitArena();
  }
  function fitArena() {
    if (el('play').hidden) return;
    const arena = el('world').parentElement;
    if (innerWidth <= 700) { arena.style.height = ''; arena.style.aspectRatio = ''; viewHeight = H; cameraTop = 0; el('world').height = H; return; }
    const other = el('play').getBoundingClientRect().height - arena.getBoundingClientRect().height + document.querySelector('.topbar').getBoundingClientRect().height;
    arena.style.height = Math.min(620, Math.max(240, innerHeight - other - 8)) + 'px';
    arena.style.aspectRatio = 'auto';
    viewHeight = Math.min(H, Math.round(arena.getBoundingClientRect().height / arena.getBoundingClientRect().width * W));
    el('world').height = viewHeight;
    cameraTop = Math.max(0, H - viewHeight - 25);
    el('world').style.objectFit = 'contain';
  }
  window.addEventListener('resize', fitArena);
  function launch(velocity) {
    if (!bird || roundDone || flying) return;
    stopSpeech();
    Body.setStatic(bird, false);
    Body.setPosition(bird, dragPoint);
    Body.setVelocity(bird, velocity);
    flying = true;
    flightAge = 0;
    dragging = false;
    progress.shots++;
    save();
    el("power").disabled = false;
    el("flight-tip").hidden = true;
    sfx("launch");
    updatePicker();
  }
  function guidedShot(index) {
    if (roundDone) return;
    if (flying) spawnBird();
    const target = pigs[index].position;
    dragPoint = { ...anchor };
    const gravity = engine.gravity.y * 0.001 * (1000 / 60) ** 2;
    const dx = target.x - anchor.x,
      dy = target.y - anchor.y;
    const frames = Math.ceil(dx / 11) + 12;
    const damping = 1 - bird.frictionAir;
    const factor = damping * (1 - damping ** frames) / (1 - damping);
    const vx = dx / factor;
    const vy = (dy - (gravity / (1 - damping)) * (frames - factor)) / factor;
    launch({ x: vx, y: vy });
    hoverTarget = index;
    if (question) speak(choices[index].text);
  }
  function correctDisplayIndex() {
    return choices.findIndex((c) => c.index === question?.correct);
  }
  function hint() {
    if (!question || roundDone) return;
    assisted = true;
    highlight = correctDisplayIndex();
    feedback("Let’s look together. " + question.hint, question.hintEs, true);
    speak(question.hint);
  }
  function feedback(en, es, wrong = false) {
    el("feedback").className = "feedback" + (wrong ? " wrong" : "");
    el("feedback").replaceChildren();
    const p = document.createElement("span");
    p.textContent = en;
    el("feedback").append(p);
    if (es) {
      const p = document.createElement("small");
      p.className = "es";
      p.textContent = es;
      el("feedback").append(p);
    }
    el("feedback").hidden = false;
  }
  function recordAnswer(correct) {
    if (!question) return;
    const f = { ...fact(question.id) };
    progress.step++;
    if (correct) {
      f.right++;
      if (assisted) f.assisted++;
      else if (f.lastSession !== session.id) {
        f.independent++;
        f.lastSession = session.id;
      }
      f.due = progress.step + (f.independent >= 2 ? 25 : 6);
      f.last = Date.now();
      session.done.push(question.id);
    } else {
      f.mistakes++;
      f.due = progress.step + 3;
      session.errors.push(question.id);
    }
    progress.facts[question.id] = f;
    progress.history.push({
      id: question.id,
      correct,
      assisted,
      at: Date.now(),
      session: session.id,
    });
    if (progress.history.length > 1200)
      progress.history = progress.history.slice(-1200);
    progress.active = session.kind === "mission" ? session : null;
    save();
  }
  function burst(x, y, color, count = 30) {
    if (reduced) count = 8;
    for (let i = 0; i < count; i++)
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.65) * 10,
        life: 40 + Math.random() * 30,
        max: 70,
        color,
        r: 2 + Math.random() * 5,
      });
  }
  function freePig(pig) {
    if (pig.freed) return;
    pig.freed = true;
    pig.launchSpot = { ...pig.position };
    pig.rescueAge = 0;
    pig.collisionFilter.mask = 0;
    Composite.remove(engine.world, pig);
    burst(pig.position.x, pig.position.y, data.planets[pig.planet].color, 24);
    stars.push({ x: pig.position.x, y: pig.position.y, vy: -3, life: 70 });
  }
  function hitAnswer(index) {
    if (roundDone || !pigs[index] || pigs[index].freed) return;
    if (session.kind === "sandbox") {
      freePig(pigs[index]);
      blast(pigs[index].position, 180);
      sfx("success");
      if (pigs.every((p) => p.freed)) {
        roundDone = true;
        el("next-round").textContent = "More flying! ↗";
        el("next-round").hidden = false;
        el("power").disabled = true;
        feedback("What a flight!", "¡Qué vuelo!");
      }
      return;
    }
    if (choices[index].index !== question.correct) {
      recordAnswer(false);
      assisted = true;
      highlight = correctDisplayIndex();
      feedback("Good try! " + question.hint, question.hintEs, true);
      speak(question.hint);
      burst(pigs[index].position.x, pigs[index].position.y, "#ffcf8c", 10);
      spawnBird();
      return;
    }
    roundDone = true;
    recordAnswer(true);
    freePig(pigs[index]);
    blast(pigs[index].position, 225);
    pigs.forEach((p) => {
      if (!p.freed) {
        const roundEngine = engine;
        setTimeout(() => { if (engine === roundEngine) { freePig(p); blast(p.position, 145); } }, 350);
      }
    });
    cameraShake = reduced ? 0 : 8;
    sfx("success");
    feedback("Yes! " + question.hint, question.hintEs);
    speak(question.hint);
    el("power").disabled = true;
    el("retry").disabled = true;
    el("answer-buttons")
      .querySelectorAll("button")
      .forEach((b) => (b.disabled = true));
    el("next-round").textContent =
      session.round === session.queue.length - 1
        ? "Mission complete! ✦"
        : "Next rescue →";
    el("next-round").hidden = false;
    updatePicker();
  }
  function blast(point, radius) {
    burst(point.x, point.y, "#ffaf64", 32);
    blocks.forEach((b) => {
      const dx = b.position.x - point.x,
        dy = b.position.y - point.y,
        d = Math.hypot(dx, dy);
      if (d < radius) {
        Body.applyForce(b, b.position, {
          x: (dx / (d || 1)) * 0.018,
          y: -0.025,
        });
      }
    });
  }
  function planetPower() {
    if (!flying || powerUsed || roundDone || !bird) return;
    powerUsed = true;
    el("power").disabled = true;
    sfx("power");
    burst(
      bird.position.x,
      bird.position.y,
      data.planets[selectedBird].color,
      20,
    );
    if (selectedBird === 0) {
      Body.setVelocity(bird, {
        x: bird.velocity.x * 1.9,
        y: bird.velocity.y * 0.6,
      });
    } else if (selectedBird === 1) {
      Body.setVelocity(bird, { x: bird.velocity.x * 0.9, y: -8 });
      bird.frictionAir = 0.015;
    } else if (selectedBird === 2) {
      Body.setVelocity(bird, {
        x: bird.velocity.x * 1.15,
        y: Math.min(bird.velocity.y, 0) - 3,
      });
      bird.force.y -= 0.006;
    } else if (selectedBird === 3) {
      Body.setVelocity(bird, {
        x: bird.velocity.x * 1.35,
        y: Math.max(bird.velocity.y, 4) + 6,
      });
      Body.setMass(bird, 12);
    } else if (selectedBird === 4) {
      Body.setMass(bird, 18);
      bird.restitution = 0.85;
      Body.setVelocity(bird, { x: bird.velocity.x * 1.25, y: bird.velocity.y });
    } else if (selectedBird === 5 || selectedBird === 7) {
      const radius = selectedBird === 5 ? 145 : 185;
      blast(bird.position, radius);
      const near = pigs.find(
        (p) =>
          !p.freed &&
          Vector.magnitude(Vector.sub(p.position, bird.position)) < radius,
      );
      if (near) hitAnswer(near.choice);
    } else if (selectedBird === 6) {
      engine.gravity.y = 0.3;
      Body.setVelocity(bird, { x: Math.max(14, bird.velocity.x * 1.2), y: 0 });
    }
  }
  function nextRound() {
    if (!roundDone) return;
    if (session.kind === "sandbox") {
      loadRound();
      return;
    }
    session.round++;
    progress.active = session.kind === "mission" ? session : null;
    save();
    if (session.round >= session.queue.length) {
      finishLevel();
      return;
    }
    const next = sessionQuestion();
    if (next?.levelIndex !== levelIndex) {
      levelIndex = next.levelIndex;
      el("play-title").textContent = data.levels[levelIndex].title;
    }
    loadRound();
  }
  function finishLevel() {
    stopSpeech();
    const l = data.levels[session.level];
    if (session.kind === "mission") {
      progress.missions[l.id] = {
        complete: true,
        completedAt: Date.now(),
        plays: (progress.missions[l.id]?.plays || 0) + 1,
      };
      progress.active = null;
    }
    save();
    mode = "celebrate";
    const facts = session.done.length;
    el("celebration-title").textContent =
      session.kind === "review"
        ? "Great practice, Jorge!"
        : "Beautiful flying, Jorge!";
    el("celebration-text").textContent =
      `You explored ${facts} space facts. Your next adventure is waiting!`;
    el("celebration-es").textContent =
      `Has practicado ${facts} contenidos. Lo que te haya costado volverá en el repaso.`;
    el("celebration-bird").className = "sprite bird-" + selectedBird;
    el("next-mission").textContent =
      session.kind === "review"
        ? "Back to my map →"
        : session.level === 11
          ? "Explore again ↗"
          : "Next adventure →";
    el("celebrate").showModal();
    speak(
      session.level === 11 && session.kind === "mission"
        ? data.cues.end
        : data.cues.level,
    );
    renderMap();
  }
  function quickPractice() {
    const seen = allQuestions.filter((q) => fact(q.id).right > 0);
    const pool = (seen.length ? seen : allQuestions.slice(0, data.levels[0].questions.length)).sort(
      (a, b) => {
        const fa = fact(a.id),
          fb = fact(b.id);
        return (
          fa.independent - fb.independent ||
          fa.due - fb.due ||
          fb.mistakes - fa.mistakes
        );
      },
    );
    const chosen = shuffle(pool.slice(0, 10)).slice(0, 5);
    startLevel(chosen[0].levelIndex, {
      kind: "review",
      questions: chosen.map((q) => q.id),
      fresh: true,
    });
  }
  function renderReport() {
    const found = allQuestions.filter((q) => fact(q.id).right > 0).length,
      known = allQuestions.filter((q) => mastery(q.id)).length,
      complete = data.levels.filter(
        (l) => progress.missions[l.id]?.complete,
      ).length;
    el("report-content").innerHTML =
      `<div class="report-stats"><div class="report-stat"><strong>${complete}/12</strong><span>Missions explored<br><span class="es">Niveles completados</span></span></div><div class="report-stat"><strong>${found}/${allQuestions.length}</strong><span>Facts discovered<br><span class="es">Contenidos practicados</span></span></div><div class="report-stat"><strong>${known}/${allQuestions.length}</strong><span>Confident answers<br><span class="es">Dos aciertos sin ayuda en sesiones distintas</span></span></div></div><p style="font-size:12px;line-height:1.8;color:var(--muted)">A mission is explored when all its challenges are complete. A confident answer needs two correct answers without a clue, in different sessions.<span class="es"> Un nivel terminado no implica que ya sepa todo. Los fallos y las pistas orientan el repaso; no restan estrellas.</span></p>`;
    data.levels.forEach((l, i) => {
      const found = l.questions.filter((q) => fact(q.id).right > 0).length,
        known = l.questions.filter((q) => mastery(q.id)).length,
        row = document.createElement("div");
      row.className = "report-row";
      row.innerHTML = `<div><b>${i + 1}. ${l.title}</b><small>${l.es}</small></div><div>${found}/${l.questions.length} explored · ${known}/${l.questions.length} confident<div class="track" style="margin-top:9px"><span style="width:${(known / l.questions.length) * 100}%"></span></div></div><button class="secondary compact">Practice ↗</button>`;
      row.querySelector("button").onclick = () => {
        el("report").close();
        startLevel(i, { fresh: true });
      };
      el("report-content").append(row);
    });
    el("save-status").textContent = saveOkay
      ? "Progress is saved on this device. Your report can be downloaded. · El progreso se guarda en este dispositivo."
      : "This browser cannot save progress. Download a report before closing. · Este navegador no permite guardar: descarga el informe.";
  }
  function openNotebook() {
    el("book-content").replaceChildren();
    data.levels.forEach((l, i) => {
      const section = document.createElement("section");
      section.className = "book-section";
      const header = document.createElement("h3");
      header.textContent = i + 1 + ". " + l.title + " · " + l.es;
      section.append(header);
      l.cards.forEach((card) => {
        const row = document.createElement("div");
        row.className = "book-line";
        const button = document.createElement("button");
        button.textContent = "▶";
        button.setAttribute("aria-label", "Listen: " + card.en);
        button.onclick = () => speak(card.en);
        const text = document.createElement("div");
        const en = document.createElement("p");
        en.textContent = card.en;
        const es = document.createElement("p");
        es.className = "es";
        es.textContent = card.es;
        text.append(en, es);
        row.append(button, text);
        section.append(row);
      });
      el("book-content").append(section);
    });
    el("notebook").showModal();
  }
  function openHangar() {
    el("hangar-content").replaceChildren();
    data.planets.forEach((p) => {
      const b = document.createElement("button");
      b.className = "hangar-card" + (p.id === selectedBird ? " selected" : "");
      b.innerHTML = `<div class="sprite bird-${p.id}"></div><h3>${p.name}</h3><p class="es">${p.es}</p><b>${p.power}</b><p>${p.intro}</p>`;
      b.onclick = () => {
        selectedBird = p.id;
        openHangarRefresh();
        speak(p.name);
      };
      el("hangar-content").append(b);
    });
    if (!el("hangar").open) el("hangar").showModal();
  }
  function openHangarRefresh() {
    el("hangar-content")
      .querySelectorAll("button")
      .forEach((b, i) => b.classList.toggle("selected", i === selectedBird));
  }
  function freeplay() {
    document.body.classList.add('playing');
    el("hangar").close();
    stopSpeech();
    progress.sessions++;
    session = {
      id: progress.sessions,
      kind: "sandbox",
      queue: [],
      done: [],
      round: 0,
    };
    mode = "sandbox";
    levelIndex = 0;
    el("home").hidden = true;
    el("play").hidden = false;
    el("play-title").textContent = "Free flight!";
    el("mission-number").textContent = "THE PLANET PLAYGROUND";
    loadRound();
  }
  function drawArena(time) {
    ctx.save();
    ctx.translate(0, -cameraTop);
    D.stars(ctx, W, H, time);
    if (cameraShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * cameraShake,
        (Math.random() - 0.5) * cameraShake,
      );
      cameraShake *= 0.9;
    }
    D.planet(ctx, levelIndex % 8, 1160, 126, 100, time * 0.08);
    const nebula = ctx.createLinearGradient(0, 480, 0, 620);
    nebula.addColorStop(0, "#4c4372");
    nebula.addColorStop(1, "#21273e");
    ctx.fillStyle = nebula;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x < W + 40; x += 40)
      ctx.lineTo(x, groundY - 24 + Math.sin(x * 0.013) * 14);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8596bd";
    ctx.fillRect(0, groundY, W, 5);
    ctx.fillStyle = "#2b3550";
    ctx.fillRect(0, groundY + 5, W, H - groundY);
    for (let i = 0; i < 15; i++) {
      D.circle(
        ctx,
        (i * 151) % W,
        groundY + 23 + ((i * 17) % 39),
        5 + (i % 8),
        "#50618550",
      );
    }
    for (const b of blocks) {
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      const width = b.bounds.max.x - b.bounds.min.x,
        height = b.bounds.max.y - b.bounds.min.y;
      const bw = b.vertices[1]
          ? Vector.magnitude(Vector.sub(b.vertices[1], b.vertices[0]))
          : 20,
        bh = b.vertices[2]
          ? Vector.magnitude(Vector.sub(b.vertices[2], b.vertices[1]))
          : 80;
      ctx.fillStyle =
        b.visual.material === "glass" ? "#8dccde99" : b.visual.color;
      ctx.strokeStyle =
        b.visual.material === "glass" ? "#b3f0f477" : "#edba8970";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 3);
      ctx.fill();
      ctx.stroke();
      if (b.visual.material === "wood") {
        ctx.strokeStyle = "#4a263633";
        ctx.beginPath();
        ctx.moveTo(-bw * 0.25, -bh * 0.35);
        ctx.lineTo(-bw * 0.25, bh * 0.35);
        ctx.stroke();
      }
      ctx.restore();
    }
    pigs.forEach((p, i) => {
      if (p.position.y > H + 100 || p.rescueAge > 2600) return;
      const x = p.position.x,
        y = p.position.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.angle);
      D.pig(ctx, p.planet, 0, 0, 31, time);
      ctx.restore();
      if (!p.freed) {
        const hi = highlight === i || hoverTarget === i;
        ctx.strokeStyle = hi ? "#a1edcf" : "#ccdfff55";
        ctx.lineWidth = hi ? 4 : 2;
        ctx.beginPath();
        ctx.arc(x, y, 43, 0, Math.PI * 2);
        ctx.stroke();
        const label = choices[i]?.text || "";
        const phaseIcons = {'New moon':'new','First quarter':'first','Full moon':'full','Third quarter':'last'};
        if (phaseIcons[label]) D.moon(ctx, p.home.x + 65, p.home.y - 3, 24, phaseIcons[label]);
        const seasonIcons = {Spring:'🌱',Summer:'☀',Autumn:'🍂',Winter:'❄'};
        if (seasonIcons[label]) { ctx.font = '32px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f9ddb6'; ctx.fillText(seasonIcons[label], p.home.x + 66, p.home.y + 8); }
        D.pill(
          ctx,
          label,
          p.home.x,
          p.home.y - 63,
          hi ? "#a1edcf" : "#f6f2e7",
          label.length > 20 ? 15 : 19,
        );
        D.pill(
          ctx,
          data.planets[p.planet].name + " pig",
          p.home.x,
          groundY + 35,
          "#a7b2cc",
          12,
        );
      }
    });
    ctx.strokeStyle = "#8b644f";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(anchor.x, groundY);
    ctx.lineTo(anchor.x - 4, anchor.y + 21);
    ctx.lineTo(anchor.x - 22, anchor.y - 10);
    ctx.moveTo(anchor.x - 4, anchor.y + 21);
    ctx.lineTo(anchor.x + 23, anchor.y - 10);
    ctx.stroke();
    ctx.strokeStyle = "#ecc291";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(anchor.x - 19, groundY - 18);
    ctx.lineTo(anchor.x - 8, anchor.y + 30);
    ctx.stroke();
    if (!flying && !roundDone) {
      const p = dragging ? dragPoint : anchor;
      ctx.strokeStyle = "#492b36";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(anchor.x - 24, anchor.y - 7);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(anchor.x + 22, anchor.y - 7);
      ctx.stroke();
      if (dragging) {
        const v = { x: (anchor.x - p.x) * 0.2, y: (anchor.y - p.y) * 0.2 };
        const g = engine.gravity.y * 0.001 * (1000 / 60) ** 2;
        for (let i = 1; i < 20; i++) {
          const n = i * 3;
          D.circle(
            ctx,
            p.x + v.x * n,
            p.y + v.y * n + 0.5 * g * n * n,
            Math.max(1, 4 - i * 0.12),
            "#f9e7bd99",
          );
        }
      }
    }
    trails.forEach((p) =>
      D.circle(
        ctx,
        p.x,
        p.y,
        p.life * 0.16,
        data.planets[selectedBird].color + "66",
      ),
    );
    if (bird && bird.position.y < H + 100)
      D.bird(
        ctx,
        selectedBird,
        bird.position.x,
        bird.position.y,
        29,
        bird.angle,
      );
    if (!flying && !roundDone)
      D.pill(
        ctx,
        data.planets[selectedBird].name,
        anchor.x,
        groundY + 35,
        data.planets[selectedBird].color,
        15,
      );
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      D.circle(ctx, p.x, p.y, p.r, p.color);
    });
    ctx.globalAlpha = 1;
    stars.forEach((s) => {
      ctx.font = "32px Trebuchet MS,sans-serif";
      ctx.fillStyle = "#ffd786";
      ctx.textAlign = "center";
      ctx.fillText("✦", s.x, s.y);
    });
    ctx.restore();
  }
  function tick(now) {
    const dt = Math.min(40, now - (lastTime || now));
    lastTime = now;
    frame++;
    if (el("lesson").open) {
      if (!lessonPaused && el("concept-video").hidden) lessonTime += dt / 1000;
      const card = data.levels[levelIndex].cards[cardIndex];
      D.scene(diagramCtx, card.scene, lessonTime);
      if (!lessonPaused)
        el("diagram-time").value = Math.floor(((lessonTime % 18) / 18) * 1000);
    }
    if (
      (mode === "play" || mode === "sandbox") &&
      engine &&
      !el("lesson").open &&
      !el("notebook").open &&
      !el("report").open
    ) {
      physicsTime += dt;
      while (physicsTime >= 1000 / 60) {
        Engine.update(engine, 1000 / 60);
        physicsTime -= 1000 / 60;
      }
      pigs.filter(p => p.freed).forEach(p => {
        p.rescueAge += dt;
        p.position.x = p.launchSpot.x + p.rescueAge * .11;
        p.position.y = p.launchSpot.y - p.rescueAge * .23 + p.rescueAge ** 2 * .000028;
        p.angle = Math.sin(p.rescueAge / 250) * .15;
      });
      const baseCamera = Math.max(0, H - viewHeight - 25);
      const targetCamera = flying && !roundDone ? Math.max(0, Math.min(baseCamera, bird.position.y - viewHeight * .32)) : baseCamera;
      cameraTop += (targetCamera - cameraTop) * .12;
      if (flying && !roundDone) {
        flightAge += dt;
        if (frame % 2 === 0)
          trails.push({ x: bird.position.x, y: bird.position.y, life: 32 });
        if (
          flightAge > 1800 &&
          (bird.position.y > H + 80 ||
            bird.position.x > W + 90 ||
            bird.position.x < -80 ||
            flightAge > 10500 ||
            Math.hypot(bird.velocity.x, bird.velocity.y) < 0.25)
        ) {
          spawnBird();
        }
      }
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.life--;
      });
      particles = particles.filter((p) => p.life > 0);
      trails.forEach((p) => p.life--);
      trails = trails.filter((p) => p.life > 0);
      stars.forEach((s) => {
        s.y += s.vy;
        s.life--;
      });
      stars = stars.filter((s) => s.life > 0);
      drawArena(now / 1000);
    }
    requestAnimationFrame(tick);
  }
  function canvasPoint(event) {
    const r = el("world").getBoundingClientRect(),
      scale = Math.min(r.width / W, r.height / viewHeight),
      offsetX = (r.width - W * scale) / 2,
      offsetY = (r.height - viewHeight * scale) / 2;
    return {
      x: (event.clientX - r.left - offsetX) / scale,
      y: (event.clientY - r.top - offsetY) / scale + cameraTop,
    };
  }
  el("world").addEventListener("pointerdown", (event) => {
    if (!engine || roundDone) return;
    if (flying) {
      planetPower();
      return;
    }
    const p = canvasPoint(event);
    if (Math.hypot(p.x - anchor.x, p.y - anchor.y) < 85) {
      dragging = true;
      dragPoint = { ...anchor };
      el("world").setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  });
  el("world").addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const p = canvasPoint(event);
    let dx = p.x - anchor.x,
      dy = p.y - anchor.y;
    const length = Math.hypot(dx, dy),
      max = 120;
    if (length > max) {
      dx *= max / length;
      dy *= max / length;
    }
    dx = Math.min(dx, 28);
    dragPoint = { x: anchor.x + dx, y: anchor.y + dy };
    Body.setPosition(bird, dragPoint);
  });
  el("world").addEventListener("pointerup", (event) => {
    if (!dragging) return;
    const velocity = {
      x: (anchor.x - dragPoint.x) * 0.2,
      y: (anchor.y - dragPoint.y) * 0.2,
    };
    if (Math.hypot(velocity.x, velocity.y) < 2) {
      spawnBird();
      return;
    }
    launch(velocity);
  });
  el("world").addEventListener("pointercancel", () => {
    if (dragging) spawnBird();
  });
  el("world").addEventListener("keydown", (event) => {
    if (["1", "2", "3"].includes(event.key)) {
      event.preventDefault();
      guidedShot(Number(event.key) - 1);
    }
    if (event.code === "Space") {
      event.preventDefault();
      planetPower();
    }
    if (event.key.toLowerCase() === "r") spawnBird();
  });
  el("continue").onclick = () =>
    startLevel(
      Math.max(
        0,
        data.levels.findIndex((l) => !progress.missions[l.id]?.complete),
      ),
    );
  el("review").onclick = quickPractice;
  el("back-map").onclick = home;
  document.querySelector(".brand").onclick = (e) => {
    e.preventDefault();
    home();
  };
  el("translate").onclick = () => {
    progress.settings.spanish = !progress.settings.spanish;
    save();
    updateSettings();
  };
  el("sound").onclick = () => {
    progress.settings.sound = !progress.settings.sound;
    stopSpeech();
    save();
    updateSettings();
  };
  el("fullscreen").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  el("hear-question").onclick = () => speak(question?.en || data.cues.launch);
  el("hear-lesson").onclick = () => {
    el('concept-video').pause();
    speak(data.levels[levelIndex].cards[cardIndex].en);
  };
  el("show-hint").onclick = hint;
  el("retry").onclick = () => {
    if (!roundDone) spawnBird();
  };
  el("power").onclick = planetPower;
  el("next-round").onclick = nextRound;
  el("lesson-again").onclick = () => {
    if (!session) return;
    lessonReturn = true;
    cardIndex = 0;
    showLesson();
  };
  el("previous-card").onclick = () => {
    if (cardIndex > 0) {
      cardIndex--;
      showLesson();
    }
  };
  el("next-card").onclick = () => {
    if (cardIndex < data.levels[levelIndex].cards.length - 1) {
      cardIndex++;
      showLesson();
    } else closeLesson();
  };
  document.querySelector(".close-lesson").onclick = closeLesson;
  el("lesson").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLesson();
  });
  el("pause-diagram").onclick = () => {
    lessonPaused = !lessonPaused;
    el("pause-diagram").textContent = lessonPaused ? "▶ Play" : "Ⅱ Pause";
  };
  el("diagram-time").oninput = () => {
    lessonPaused = true;
    lessonTime = (Number(el("diagram-time").value) / 1000) * 18;
    el("pause-diagram").textContent = "▶ Play";
  };
  el("watch-video").onclick = () => {
    const video = el("concept-video");
    if (video.hidden) {
      stopSpeech();
      el("diagram").hidden = true;
      video.hidden = false;
      el('pause-diagram').hidden = true;
      el('diagram-time').hidden = true;
      el('diagram-hint').hidden = true;
      video.play().catch(() => {});
      el("watch-video").textContent = "▤ Interactive model";
    } else {
      video.pause();
      video.hidden = true;
      el("diagram").hidden = false;
      el('pause-diagram').hidden = false;
      el('diagram-time').hidden = false;
      el('diagram-hint').hidden = false;
      el("watch-video").textContent = "▷ Space movie";
    }
  };
  document.querySelectorAll(".close-dialog").forEach(
    (b) =>
      (b.onclick = () => {
        stopSpeech();
        b.closest("dialog").close();
      }),
  );
  document.querySelectorAll("dialog").forEach((d) =>
    d.addEventListener("cancel", () => {
      stopSpeech();
      el("concept-video").pause();
    }),
  );
  el("open-notebook").onclick = openNotebook;
  el("open-hangar").onclick = openHangar;
  el("freeplay").onclick = freeplay;
  el("progress-report").onclick = () => {
    renderReport();
    el("report").showModal();
  };
  el("celebration-map").onclick = home;
  el("next-mission").onclick = () => {
    const next =
      session?.kind === "review" ? -1 : Math.min(11, session.level + 1);
    el("celebrate").close();
    if (next < 0) home();
    else startLevel(next, { fresh: true });
  };
  el("export-progress").onclick = () => {
    const report = {
      game: "Pájaros Locos: Sistema Solar",
      learner: "Jorge",
      exportedAt: new Date().toISOString(),
      ...progress,
      levels: data.levels.map((l) => ({
        title: l.title,
        content: l.es,
        complete: !!progress.missions[l.id]?.complete,
        questions: l.questions.map((q) => ({
          question: q.en,
          spanish: q.es,
          ...fact(q.id),
          confident: mastery(q.id),
        })),
      })),
    };
    if (window.SolarAndroid?.saveReport) {
      window.SolarAndroid.saveReport(JSON.stringify(report, null, 2));
      return;
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "jorge-sistema-solar-progreso.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  el("reset-progress").onclick = () => {
    if (
      confirm(
        "Start a new journey? This clears the progress saved on this device.\n¿Empezar de nuevo? Se borrará el progreso de este dispositivo.",
      )
    ) {
      progress = empty();
      save();
      updateSettings();
      renderReport();
      renderMap();
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSpeech();
      el("concept-video").pause();
      lastTime = 0;
    }
  });
  window.render_game_to_text = () =>
    JSON.stringify({
      mode,
      level: levelIndex,
      lessonCard: cardIndex,
      question: question?.id,
      choices: choices.map((c) => c.text),
      selectedBird: data.planets[selectedBird].name,
    camera: { top: cameraTop, height: viewHeight },
      flying,
      powerUsed,
      roundDone,
      progress: {
        complete: Object.keys(progress.missions).length,
        discovered: allQuestions.filter((q) => fact(q.id).right > 0).length,
        confident: allQuestions.filter((q) => mastery(q.id)).length,
      },
      session: session && {
        round: session.round,
        total: session.queue.length,
        kind: session.kind,
      },
      voiceReady: !!voiceManifest?.ready,
      videoReady: Object.keys(media).length,
    });
  if (new URLSearchParams(location.search).get("qa") === "1")
    window.solarQA = {
      get state() {
        return {
          progress,
          session,
          question,
          choices,
          pigs,
          bird,
          engine,
          mode,
          selectedBird,
        };
      },
      startLevel,
      guidedShot,
      correctDisplayIndex,
      nextRound,
      planetPower,
      freeplay,
      drawScene: (scene, t) => D.scene(diagramCtx, scene, t),
      home,
    };
  updateSettings();
  renderMap();
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.SolarAndroid && !new URLSearchParams(location.search).has('qa')) navigator.serviceWorker.register('sw.js').catch(() => {});
  requestAnimationFrame(tick);
})();

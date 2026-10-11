(function () {
  const TAU = Math.PI * 2;
  const atlas = new Image();
  atlas.src = "assets/planet-birds.png";
  function circle(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  function pill(ctx, text, x, y, color = "#f4f0e8", size = 19) {
    ctx.font = `700 ${size}px Trebuchet MS, sans-serif`;
    const width = ctx.measureText(text).width + 25;
    ctx.fillStyle = "#10152ecf";
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - size - 7, width, size + 17, 10);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y + 3);
  }
  function stars(ctx, w, h, time = 0) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#131630");
    g.addColorStop(0.6, "#25264d");
    g.addColorStop(1, "#1c2546");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 65; i++) {
      const x = (i * 193.17 + 37) % w,
        y = (i * 127.39 + 13) % (h * 0.86),
        r = i % 7 === 0 ? 1.9 : 1;
      circle(
        ctx,
        x,
        y,
        r,
        `rgba(206,218,255,${0.22 + (0.3 * (1 + Math.sin(time * 0.4 + i))) / 2})`,
      );
    }
  }
  function planet(ctx, id, x, y, r, phase = 0, shade = true) {
    ctx.save();
    ctx.translate(x, y);
    if (id === 5) {
      ctx.strokeStyle = "#efc991";
      ctx.lineWidth = r * 0.24;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.62, r * 0.38, -0.25, 0, Math.PI);
      ctx.stroke();
    }
    const colors = [
      "#a5a0b2",
      "#e8c981",
      "#4dbde5",
      "#de7554",
      "#d1aa91",
      "#e5c68b",
      "#8fdad7",
      "#668bdb",
    ];
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.06, 0, 0, r);
    g.addColorStop(0, colors[id]);
    g.addColorStop(0.65, colors[id]);
    g.addColorStop(
      1,
      [
        "#686276",
        "#aa854c",
        "#2d668b",
        "#804536",
        "#7d584a",
        "#97704f",
        "#497b8e",
        "#354685",
      ][id],
    );
    circle(ctx, 0, 0, r, g);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    if (id === 2) {
      ctx.fillStyle = "#8dcf94";
      for (let i = 0; i < 6; i++) {
        const ox = Math.sin(i * 2.1 + phase) * r * 0.87,
          oy = Math.cos(i * 1.5) * r * 0.58;
        ctx.beginPath();
        ctx.moveTo(ox - r * 0.23, oy - r * 0.17);
        ctx.lineTo(ox + r * 0.17, oy - r * 0.25);
        ctx.lineTo(ox + r * 0.29, oy + r * 0.04);
        ctx.lineTo(ox + r * 0.06, oy + r * 0.29);
        ctx.lineTo(ox - r * 0.18, oy + r * 0.13);
        ctx.closePath();
        ctx.fill();
      }
    } else if (id === 4 || id === 5 || id === 1 || id === 7) {
      for (let i = -3; i <= 3; i++) {
        ctx.fillStyle = i % 2 ? "#fff5c929" : "#744b4822";
        ctx.fillRect(-r, i * r * 0.23, r * 2, r * 0.11);
      }
    } else if (id === 0 || id === 3) {
      for (let i = 0; i < 7; i++)
        circle(
          ctx,
          Math.sin(i * 4.2) * r * 0.7,
          Math.cos(i * 1.3) * r * 0.65,
          r * 0.1,
          "#251d3b33",
        );
    }
    if (shade) {
      const shadow = ctx.createLinearGradient(-r, 0, r, 0);
      shadow.addColorStop(0, "#080c1b00");
      shadow.addColorStop(0.53, "#080c1b00");
      shadow.addColorStop(1, "#080c1b88");
      ctx.fillStyle = shadow;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    ctx.restore();
    if (id === 5) {
      ctx.strokeStyle = "#efc991";
      ctx.lineWidth = r * 0.24;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.62, r * 0.38, -0.25, Math.PI, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  function sun(ctx, x, y, r, time = 0) {
    ctx.save();
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.8);
    glow.addColorStop(0, "#ffb85255");
    glow.addColorStop(1, "#ffb85200");
    circle(ctx, 0, 0, r * 1.8, glow);
    ctx.save();
    ctx.rotate(time * 0.05);
    ctx.strokeStyle = "#ffb55b88";
    ctx.lineWidth = 4;
    for (let i = 0; i < 14; i++) {
      ctx.rotate(TAU / 14);
      ctx.beginPath();
      ctx.moveTo(r * 1.2, 0);
      ctx.lineTo(r * 1.45, 0);
      ctx.stroke();
    }
    ctx.restore();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    g.addColorStop(0, "#ffe799");
    g.addColorStop(0.5, "#ffc25b");
    g.addColorStop(1, "#ee8150");
    circle(ctx, 0, 0, r, g);
    for (let i = 0; i < 12; i++)
      circle(
        ctx,
        Math.sin(i * 6.7) * r * 0.75,
        Math.cos(i * 3.8) * r * 0.65,
        r * 0.06,
        "#e7833430",
      );
    ctx.restore();
  }
  function moon(ctx, x, y, r, phase = "full") {
    circle(ctx, x, y, r, "#687391");
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.clip();
    if (phase === "full") {
      circle(ctx, x, y, r, "#e0e5e6");
    } else if (phase === "first" || phase === "last") {
      ctx.fillStyle = "#e0e5e6";
      ctx.fillRect(phase === "first" ? x : x - r, y - r, r, r * 2);
    }
    for (let i = 0; i < 6; i++)
      circle(
        ctx,
        x + Math.sin(i * 4.2) * r * 0.68,
        y + Math.cos(i * 1.7) * r * 0.68,
        r * 0.1,
        "#4558762a",
      );
    ctx.restore();
  }
  function bird(ctx, id, x, y, r, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (atlas.complete && atlas.naturalWidth) {
      const cw = atlas.naturalWidth / 4,
        ch = atlas.naturalHeight / 2;
      if (id === 6) {
        ctx.beginPath();
        ctx.rect(-r * .83, -r * 1.2, r * 2.03, r * 2.4);
        ctx.clip();
      }
      ctx.drawImage(
        atlas,
        (id % 4) * cw,
        Math.floor(id / 4) * ch,
        cw,
        ch,
        -r * 1.2,
        -r * 1.2,
        r * 2.4,
        r * 2.4,
      );
    } else {
      planet(ctx, id, 0, 0, r, 0, false);
      circle(ctx, -r * 0.2, -r * 0.08, r * 0.2, "white");
      circle(ctx, r * 0.15, -r * 0.08, r * 0.2, "white");
      circle(ctx, -r * 0.13, -r * 0.07, r * 0.085, "#222643");
      circle(ctx, r * 0.22, -r * 0.07, r * 0.085, "#222643");
      ctx.fillStyle = "#ffb354";
      ctx.beginPath();
      ctx.moveTo(r * 0.1, r * 0.1);
      ctx.lineTo(r * 0.6, r * 0.22);
      ctx.lineTo(r * 0.1, r * 0.36);
      ctx.fill();
    }
    ctx.restore();
  }
  function pig(ctx, id, x, y, r, time = 0) {
    ctx.save();
    ctx.translate(x, y);
    const colors = [
      "#b9b4c3",
      "#dbd29a",
      "#75b8db",
      "#d88972",
      "#d6c394",
      "#d2cc97",
      "#ade4e6",
      "#8aa1e5",
    ];
    circle(ctx, 0, 0, r, colors[id]);
    if (id === 2) {
      circle(ctx, -r * .4, -r * .55, r * .28, '#8ac78d');
      circle(ctx, r * .45, r * .5, r * .22, '#8ac78d');
    }
    if (id === 0 || id === 3) {
      circle(ctx, -r * .64, r * .23, r * .13, '#654b6b33');
      circle(ctx, r * .42, -r * .57, r * .13, '#654b6b33');
    }
    if (id === 4) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.clip();
      ctx.fillStyle = "#96744d33";
      for (let i = -2; i < 3; i++)
        ctx.fillRect(-r, i * r * 0.35, r * 2, r * 0.12);
      ctx.restore();
    }
    if (id === 5) {
      ctx.strokeStyle = "#f3d299";
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.ellipse(0, 4, r * 1.3, r * 0.32, -0.2, 0, TAU);
      ctx.stroke();
    }
    circle(ctx, -r * 0.61, -r * 0.7, r * 0.28, colors[id]);
    circle(ctx, r * 0.6, -r * 0.7, r * 0.28, colors[id]);
    circle(ctx, -r * 0.33, -r * 0.17, r * 0.2, "#fff9e8");
    circle(ctx, r * 0.33, -r * 0.17, r * 0.2, "#fff9e8");
    circle(ctx, -r * 0.27, -r * 0.14, r * 0.08, "#2b3048");
    circle(ctx, r * 0.26, -r * 0.14, r * 0.08, "#2b3048");
    ctx.fillStyle = "#6a9169";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 0.46, r * 0.31, 0, 0, TAU);
    ctx.fill();
    circle(ctx, -r * 0.16, r * 0.26, r * 0.085, "#304c40");
    circle(ctx, r * 0.16, r * 0.26, r * 0.085, "#304c40");
    ctx.strokeStyle = "#cadce959";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -r * 0.04, r * 1.1, Math.PI * 0.97, Math.PI * 2.03);
    ctx.stroke();
    ctx.restore();
  }
  function orbit(ctx, x, y, rx, ry) {
    ctx.strokeStyle = "#bacfff48";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function arrow(ctx, x, y, angle, color = "#a1edcf", size = 17) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.6);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.6);
    ctx.stroke();
    ctx.restore();
  }
  function axis(ctx, x, y, r) {
    ctx.strokeStyle = "#a1edcf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.42, y + r * 1.24);
    ctx.lineTo(x + r * 0.42, y - r * 1.24);
    ctx.stroke();
  }
  function scene(ctx, type, t = 0, selected = 0) {
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    stars(ctx, w, h, t);
    ctx.save();
    ctx.scale(w / 900, h / 540);
    let a = t * 0.35 * (['orbit','year','seasons','moon','month'].includes(type) ? -1 : 1);
    if (["system", "inner", "outer"].includes(type)) {
      sun(ctx, 70, 250, 43, t);
      pill(ctx, "Sun", 70, 335, "#ffcf8c", 17);
      const all = SOLAR.planets,
        first = type === "outer" ? 4 : 0,
        last = type === "inner" ? 4 : 8,
        count = last - first;
      for (let n = first; n < last; n++) {
        const i = n - first,
          x = 165 + i * (670 / Math.max(count - 1, 1)),
          r = [21, 29, 32, 26, 43, 35, 30, 30][n];
        planet(ctx, n, x, 252, r, a * 0.2);
        pill(ctx, all[n].name, x, 345, all[n].color, count === 8 ? 14 : 21);
        pill(ctx, String(n + 1), x, 192, "#a1edcf", 16);
      }
      ctx.strokeStyle = "#a1edcf40";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(160, 395);
      ctx.lineTo(840, 395);
      ctx.stroke();
      arrow(ctx, 840, 395, 0);
      pill(ctx, "From the Sun", 460, 445, "#a1edcf", 21);
    } else if (type === "sun") {
      sun(ctx, 450, 255, 130, t);
      pill(ctx, "The Sun is a star", 450, 450, "#ffcf8c", 30);
    } else if (["earth", "life"].includes(type)) {
      planet(ctx, 2, 440, 270, 137, a, true);
      pill(ctx, "Earth", 440, 460, "#a1edcf", 27);
      pill(ctx, "Water", 210, 170, "#7fccec", 24);
      pill(ctx, "Air", 675, 175, "#bac7f5", 24);
      pill(
        ctx,
        type === "life" ? "Life" : "Land",
        675,
        345,
        "#a1edcf",
        24,
      );
      if (type === "life") {
        ctx.font = "50px sans-serif";
        ctx.fillText("🌱", 195, 358);
        ctx.fillText("🌳", 687, 278);
      }
    } else if (["orbit", "year", "seasons"].includes(type)) {
      const cx = 450,
        cy = 265;
      orbit(ctx, cx, cy, 285, 148);
      sun(ctx, cx, cy, 58, t);
      const ex = cx + Math.cos(a) * 285,
        ey = cy + Math.sin(a) * 148;
      planet(ctx, 2, ex, ey, 39, a, false);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(Math.atan2(ey - cy, ex - cx));
      ctx.beginPath(); ctx.arc(0, 0, 39, 0, TAU); ctx.clip();
      ctx.fillStyle = '#11142f99'; ctx.fillRect(0, -39, 39, 78);
      ctx.restore();
      if (type !== "orbit") axis(ctx, ex, ey, 39);
      arrow(ctx, cx, cy + 148, 0);
      if (type === "seasons") {
        circle(ctx, ex + 15, ey - 33, 5, '#ffcf8c');
        ctx.strokeStyle = '#ffcf8c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ex + 17, ey - 33); ctx.lineTo(ex + 45, ey - 10); ctx.stroke();
        pill(ctx, 'Our side', ex + 90, ey, '#ffcf8c', 15);
        [
          ["Spring", 450, 65, "#a1edcf"],
          ["Summer", 104, 265, "#ffcf8c"],
          ["Autumn", 450, 481, "#ffab84"],
          ["Winter", 801, 265, "#9dd5f5"],
        ].forEach((v) => pill(ctx, ...v, 22));
      } else {
        pill(
          ctx,
          type === "year" ? "1 trip = 1 year" : "Earth goes around the Sun",
          450,
          470,
          "#a1edcf",
          25,
        );
        pill(ctx, "Sun", cx, cy + 96, "#ffcf8c", 18);
      }
    } else if (["moon", "month"].includes(type)) {
      planet(ctx, 2, 450, 270, 91, a * 0.3);
      orbit(ctx, 450, 270, 220, 130);
      moon(ctx, 450 + Math.cos(a) * 220, 270 + Math.sin(a) * 130, 34);
      pill(ctx, "Earth", 450, 402, "#a1edcf", 22);
      pill(
        ctx,
        "Moon",
        450 + Math.cos(a) * 220,
        270 + Math.sin(a) * 130 - 53,
        "#dfe3ec",
        20,
      );
      pill(
        ctx,
        type === "month" ? "About 28 days" : "The Moon goes around Earth",
        450,
        70,
        "#a1edcf",
        26,
      );
      if (type === "month") {
        const days = 1 + Math.floor(((((-a / TAU) % 1) + 1) % 1) * 28);
        pill(ctx, "Day " + days, 450, 485, "#ffcf8c", 20);
      }
    } else if (type === "phases") {
      const names = ["New moon", "First quarter", "Full moon", "Third quarter"],
        phases = ["new", "first", "full", "last"],
        index = Math.floor((((t * 0.12) % 4) + 4) % 4);
      for (let i = 0; i < 4; i++) {
        const x = 135 + i * 210;
        moon(ctx, x, 235, 66, phases[i]);
        if (i === index) {
          ctx.strokeStyle = "#a1edcf";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, 235, 83, 0, TAU);
          ctx.stroke();
        }
        pill(ctx, names[i], x, 354, "#dfe3ec", 21);
        if (i < 3) arrow(ctx, x + 115, 235, 0, "#ffcf8c", 12);
      }
      pill(ctx, "The same Moon. Different lit parts.", 450, 452, "#a1edcf", 24);
    } else if (["rotation", "daynight", "axis"].includes(type)) {
      sun(ctx, 138, 266, 63, t);
      const ex = 560,
        ey = 270,
        r = 110;
      planet(ctx, 2, ex, ey, r, a, false);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, TAU);
      ctx.clip();
      ctx.fillStyle = "#11142fcf";
      ctx.fillRect(ex, ey - r, r, r * 2);
      ctx.restore();
      axis(ctx, ex, ey, r);
      if (type === "axis") {
        pill(ctx, "A tilted axis", 560, 445, "#a1edcf", 28);
      } else {
        pill(ctx, "Day", 390, 166, "#ffcf8c", 22);
        pill(ctx, "Night", 735, 166, "#bac7f5", 22);
        const mx = ex + Math.cos(a) * r * 0.8,
          my = ey + Math.sin(a) * r * 0.3;
        circle(ctx, mx, my, 8, "#ffb564");
        ctx.strokeStyle = "#f6f3e78c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 150, 52, 0, 0, TAU);
        ctx.stroke();
        arrow(ctx, ex - 150, ey, Math.PI / 2);
        pill(
          ctx,
          type === "rotation"
            ? "1 turn = 24 hours"
            : "Rotation makes day and night",
          450,
          466,
          "#a1edcf",
          25,
        );
      }
    }
    ctx.font = "12px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#b4bed280";
    ctx.textAlign = "left";
    ctx.fillText("A simple model · Not to scale", 20, 520);
    ctx.restore();
  }
  window.SpaceDraw = {
    circle,
    pill,
    stars,
    planet,
    sun,
    moon,
    bird,
    pig,
    orbit,
    arrow,
    axis,
    scene,
    atlas,
  };
})();

// The cat you carry down from the cliff. Once you set it down it follows you for
// the rest of the journey — through the forest and into the ending — and when
// you stay still for a moment it comes over and sits next to you.

export function makeCatTextures(scene) {
  const make = (cb, w, h, key) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    cb(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // cat (held) — curled up small in your arms, facing left
  make((g) => {
    g.fillStyle(0x8a7a66);
    g.fillEllipse(16, 20, 22, 12);              // body curled
    g.fillEllipse(9, 14, 11, 10);               // head
    g.fillTriangle(4, 10, 8, 10, 5, 4);         // ear
    g.fillTriangle(10, 10, 14, 10, 13, 4);      // ear
    g.fillRect(24, 12, 4, 12);                  // tail
    g.fillStyle(0x6b5d4d);
    g.fillRect(14, 16, 3, 6); g.fillRect(19, 16, 3, 6);  // stripes
    g.fillStyle(0x2b2620);
    g.fillRect(6, 13, 2, 2); g.fillRect(11, 13, 2, 2);   // eyes
  }, 32, 28, 'cat-held');

  // cat (standing) — alert, on its own feet, facing left
  make((g) => {
    g.fillStyle(0x8a7a66);
    g.fillEllipse(17, 14, 24, 10);              // body
    g.fillRect(8, 18, 3, 8); g.fillRect(13, 18, 3, 8);   // front legs
    g.fillRect(20, 18, 3, 8); g.fillRect(25, 18, 3, 8);  // back legs
    g.fillEllipse(7, 9, 11, 10);                // head, up
    g.fillTriangle(2, 6, 6, 6, 3, 0);           // ear
    g.fillTriangle(8, 6, 12, 6, 11, 0);         // ear
    g.fillRect(28, 6, 3, 12);                   // tail up
    g.fillStyle(0x6b5d4d);
    g.fillRect(14, 11, 3, 5); g.fillRect(20, 11, 3, 5);  // stripes
    g.fillStyle(0x2b2620);
    g.fillRect(4, 8, 2, 2); g.fillRect(9, 8, 2, 2);      // eyes
  }, 34, 30, 'cat-stand');

  // cat (sitting) — settled and calm, tail curled round, facing left
  make((g) => {
    g.fillStyle(0x8a7a66);
    g.fillEllipse(16, 18, 20, 16);              // body, upright haunches
    g.fillEllipse(8, 9, 11, 10);                // head
    g.fillTriangle(3, 6, 7, 6, 4, 0);           // ear
    g.fillTriangle(9, 6, 13, 6, 12, 0);         // ear
    g.fillRect(6, 20, 4, 6); g.fillRect(22, 20, 4, 6);   // front paws down
    g.fillStyle(0x6b5d4d);
    g.fillEllipse(24, 22, 12, 5);               // tail curled round the side
    g.fillStyle(0x2b2620);
    g.fillRect(5, 8, 2, 2); g.fillRect(10, 8, 2, 2);     // eyes
  }, 32, 28, 'cat-sit');
}

const TRAIL_GAP = 100;     // how far behind it trails while you walk
const CLOSE_GAP = 38;      // how close it comes when you stop
const SETTLE_MS = 700;     // stillness before it walks over to you
const SIT_MS = 1500;       // stillness before it sits down

// call every frame. `floorY` is the y of the ground under the cat's feet.
// `restSide` (-1 left, 1 right) picks where it settles when that matters.
export function updateCatFollow(scene, cat, player, floorY, restSide = 0) {
  const moving = Math.abs(player.body.velocity.x) > 20;
  cat.stillMs = moving ? 0 : (cat.stillMs || 0) + scene.game.loop.delta;

  // it keeps to whichever side it's already on, so turning in place doesn't
  // make it snap across you — it only closes a gap that's too wide
  const gap = cat.x - player.x;
  const side = gap >= 0 ? 1 : -1;
  const wanted = cat.stillMs > SETTLE_MS ? CLOSE_GAP : TRAIL_GAP;
  let target = cat.x;
  if (Math.abs(gap) > wanted) target = player.x + side * wanted;
  if (restSide && cat.stillMs > SETTLE_MS) target = player.x + restSide * CLOSE_GAP;
  cat.x += (target - cat.x) * 0.06;
  cat.y += (floorY - cat.y) * 0.18;

  const arrived = Math.abs(target - cat.x) < 4;
  if (cat.stillMs > SIT_MS && arrived) {
    if (cat.texture.key !== 'cat-sit') cat.setTexture('cat-sit');
  } else if (cat.texture.key !== 'cat-stand') {
    cat.setTexture('cat-stand');
  }
  // the art faces left — turn it to look at you
  cat.setFlipX(cat.x < player.x);
}

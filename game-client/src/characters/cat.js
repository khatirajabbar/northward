// The cat you carry down from the cliff. Once you set it down it follows you for
// the rest of the journey — through the forest and into the ending — and when
// you stay still for a moment it comes over and sits next to you.
//
// It's one sprite playing the cat-* animations (the sheet is drawn by
// tools/animals.mjs and shown at 2x, like the rest of the forest's art).

const ART = 2;
const SINK = 2;            // its outline sits just into the grass

export function makeCat(scene, x, floorY) {
  return scene.add.sprite(x, floorY + SINK, 'woods-cat').setOrigin(0.5, 1).setScale(ART);
}

const TRAIL_GAP = 100;     // how far behind it trails while you walk
const CLOSE_GAP = 44;      // how close it comes when you stop
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
  const step = (target - cat.x) * 0.06;
  cat.x += step;
  cat.y += (floorY + SINK - cat.y) * 0.18;

  const arrived = Math.abs(target - cat.x) < 4;
  if (cat.stillMs > SIT_MS && arrived) cat.play('cat-sit', true);
  else cat.play(Math.abs(step) > 0.25 ? 'cat-walk' : 'cat-stand', true);
  // the art faces left — walking, it looks where it's going; stopped, at you
  cat.setFlipX(arrived ? cat.x < player.x : step > 0);
}

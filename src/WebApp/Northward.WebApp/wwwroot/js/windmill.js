(function () {
  document.querySelectorAll('.pinwheel').forEach((w) => {
    const trigger = w.closest('[data-windmill-trigger]') || w.parentElement || w;
    const blades = w.querySelector('.pinwheel__blades');
    let currentDeg = 0;

    trigger.addEventListener('mouseenter', () => {
      blades.style.transition = 'none';
      blades.style.transform = '';
      w.classList.add('spinning');
    });

    trigger.addEventListener('mouseleave', () => {
      // capture current rotation from the running animation
      const computed = getComputedStyle(blades).transform;
      w.classList.remove('spinning');
      if (computed && computed !== 'none') {
        const match = computed.match(/matrix\(([^)]+)\)/);
        if (match) {
          const [a, b] = match[1].split(',').map(Number);
          currentDeg = Math.atan2(b, a) * (180 / Math.PI);
        }
      }
      // snap to current angle, then coast a small bit and settle
      blades.style.transition = 'none';
      blades.style.transform = `rotate(${currentDeg}deg)`;
      void blades.offsetWidth;
      blades.style.transition = 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)';
      blades.style.transform = `rotate(${currentDeg + 60}deg)`;
    });
  });
})();

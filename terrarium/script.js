for (let i = 1; i <= 14; i++) {
  dragElement(document.getElementById(`plant${i}`));
}

let currentTopZ = 1;

function dragElement(terrariumElement) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  let isDragging = false;
  let hasMoved = false;
  let startX = 0,
    startY = 0;
  const DRAG_THRESHOLD = 3;

  terrariumElement.onpointerdown = pointerDrag;

  terrariumElement.ondblclick = () => {
    if (!isDragging) {
      terrariumElement.style.zIndex = ++currentTopZ;
    }
  };

  function pointerDrag(e) {
    e.preventDefault();

    isDragging = true;
    hasMoved = false;

    startX = e.clientX;
    startY = e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    if (terrariumElement.setPointerCapture) {
      try {
        terrariumElement.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    document.onpointermove = elementDrag;
    document.onpointerup = stopElementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();

    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);

    if (!hasMoved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
      hasMoved = true;
      terrariumElement.style.zIndex = ++currentTopZ;
    }

    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    terrariumElement.style.top = terrariumElement.offsetTop - pos2 + "px";
    terrariumElement.style.left = terrariumElement.offsetLeft - pos1 + "px";
  }

  function stopElementDrag(e) {
    document.onpointerup = null;
    document.onpointermove = null;

    if (
      terrariumElement.releasePointerCapture &&
      e &&
      e.pointerId !== undefined
    ) {
      try {
        terrariumElement.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    setTimeout(() => {
      isDragging = false;
      hasMoved = false;
    }, 80);
  }
}

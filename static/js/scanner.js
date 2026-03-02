let html5QrcodeScanner = null;
let lastDecodedText = null;
let scanCount = 0;

const currentCodeEl = document.getElementById("current-code");
const scanCountEl = document.getElementById("scan-count");
const nextBtn = document.getElementById("next-btn");
const finishBtn = document.getElementById("finish-btn");
const modalEl = document.getElementById("finish-modal");
const cancelFinishBtn = document.getElementById("cancel-finish");
const confirmFinishBtn = document.getElementById("confirm-finish");

function onScanSuccess(decodedText, decodedResult) {
  if (decodedText === lastDecodedText) {
    return;
  }
  lastDecodedText = decodedText;
  currentCodeEl.textContent = decodedText;
  nextBtn.disabled = false;
  finishBtn.disabled = false;
}

function onScanFailure(error) {
  // errores de lectura, se ignoran
}

function startScanner() {
  const config = {
    fps: 10,
    qrbox: 250
  };

  html5QrcodeScanner = new Html5Qrcode("qr-reader");

  // iOS / Safari necesita que esto se dispare por un gesto de usuario
  html5QrcodeScanner
    .start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    )
    .catch(err => {
      console.error("Error al iniciar cámara:", err);
      alert("Error al acceder a la cámara. Asegúrate de haber dado permiso y estar en HTTPS o localhost.");
    });
}

async function sendScan(code) {
  const res = await fetch(ADD_SCAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.error || "Error al guardar la lectura.";
    alert(msg);
    return false;
  }
  return true;
}

nextBtn.addEventListener("click", async () => {
  if (!lastDecodedText) return;

  nextBtn.disabled = true;
  finishBtn.disabled = true;

  const ok = await sendScan(lastDecodedText);
  if (!ok) {
    nextBtn.disabled = false;
    finishBtn.disabled = false;
    return;
  }

  scanCount += 1;
  scanCountEl.textContent = scanCount.toString();
  lastDecodedText = null;
  currentCodeEl.textContent = "—";
});

finishBtn.addEventListener("click", () => {
  modalEl.classList.remove("hidden");
});

cancelFinishBtn.addEventListener("click", () => {
  modalEl.classList.add("hidden");
});

confirmFinishBtn.addEventListener("click", () => {
  modalEl.classList.add("hidden");
  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().catch(err => console.error(err));
  }
  nextBtn.disabled = true;
  finishBtn.disabled = true;
  alert("Sesión finalizada. Puedes recargar la página para iniciar una nueva sesión.");
});

// IMPORTANTE: Safari/iOS suele exigir que esto se ejecute tras un gesto.
// Para desarrollo en PC se lanza directo al cargar:
document.addEventListener("DOMContentLoaded", () => {
  startScanner();
});


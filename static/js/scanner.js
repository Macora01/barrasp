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
  if (decodedText === lastDecodedText) return;

  lastDecodedText = decodedText;
  currentCodeEl.textContent = decodedText;
  nextBtn.disabled = false;
  finishBtn.disabled = false;
}

function onScanFailure(error) {
  // se ignoran errores de lectura
}

function startScanner() {
  const formats = Html5QrcodeSupportedFormats;

  const config = {
    fps: 10,
    qrbox: { width: 350, height: 140 },
    formatsToSupport: [
      formats.CODE_128,
      formats.CODE_39,
      formats.EAN_13,
      formats.EAN_8,
      formats.UPC_A,
      formats.UPC_E
    ],
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true
    },
    showTorchButtonIfSupported: true
  };

  const scannerConfig = {
    rememberLastUsedCamera: true,
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
  };

  const html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    Object.assign(config, scannerConfig),
    false
  );

  html5QrcodeScanner.render(onScanSuccess, onScanFailure);

  // Guardamos referencia global para poder apagarlo al finalizar
  window._html5Scanner = html5QrcodeScanner;
}

async function sendScan(code) {
  const res = await fetch(ADD_SCAN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || "Error al guardar la lectura.");
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
  if (window._html5Scanner) {
    window._html5Scanner.clear().catch(err => console.error(err));
  }
  nextBtn.disabled = true;
  finishBtn.disabled = true;
  alert("Sesión finalizada. Puedes recargar la página para iniciar una nueva sesión.");
});

document.addEventListener("DOMContentLoaded", startScanner);

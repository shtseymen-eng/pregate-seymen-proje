import {
  canCreatePresentation,
  createPresentationFromFiles,
  downloadLastDeck,
} from "./app.js";


function setHidden(element, hidden) {
  element.hidden = hidden;
}


export function mountPresentationApp(root) {
  const pregateInput = root.querySelector("#pregate-file");
  const vehicleInput = root.querySelector("#vehicle-file");
  const createButton = root.querySelector("#create-presentation");
  const repeatButton = root.querySelector("#repeat-download");
  const progress = root.querySelector("#progress-status");
  const errorBox = root.querySelector("#error-message");
  const successBox = root.querySelector("#success-result");
  const outputName = root.querySelector("#output-name");
  const summaryPeriod = root.querySelector("#summary-period");
  const summaryTotal = root.querySelector("#summary-total");
  const summaryRavago = root.querySelector("#summary-ravago");
  const summaryAlisan = root.querySelector("#summary-alisan");
  const pregateName = root.querySelector("#pregate-name");
  const vehicleName = root.querySelector("#vehicle-name");
  let busy = false;

  function selected(input) {
    return input.files?.[0] ?? null;
  }

  function refresh() {
    const pregate = selected(pregateInput);
    const vehicles = selected(vehicleInput);
    pregateName.textContent = pregate?.name ?? "Dosya seçilmedi";
    vehicleName.textContent = vehicles?.name ?? "Dosya seçilmedi";
    pregateName.dataset.ready = String(Boolean(pregate));
    vehicleName.dataset.ready = String(Boolean(vehicles));
    createButton.disabled = busy || !canCreatePresentation(pregate, vehicles);
  }

  pregateInput.addEventListener("change", refresh);
  vehicleInput.addEventListener("change", refresh);

  createButton.addEventListener("click", async () => {
    busy = true;
    setHidden(errorBox, true);
    setHidden(successBox, true);
    progress.textContent = "Hazırlanıyor";
    progress.dataset.state = "working";
    refresh();
    try {
      const result = await createPresentationFromFiles(
        selected(pregateInput),
        selected(vehicleInput),
        { onProgress: (message) => { progress.textContent = message; } },
      );
      outputName.textContent = result.filename;
      summaryPeriod.textContent = result.model.period.label;
      summaryTotal.textContent = result.model.summary.total.toLocaleString("tr-TR");
      summaryRavago.textContent = result.model.summary.ravago.toLocaleString("tr-TR");
      summaryAlisan.textContent = result.model.summary.alisan.toLocaleString("tr-TR");
      setHidden(successBox, false);
      progress.dataset.state = "success";
      downloadLastDeck();
    } catch (error) {
      errorBox.textContent = error instanceof Error ? error.message : String(error);
      setHidden(errorBox, false);
      progress.textContent = "Dosyalarınızı kontrol edip tekrar deneyin";
      progress.dataset.state = "error";
    } finally {
      busy = false;
      refresh();
    }
  });

  repeatButton.addEventListener("click", () => downloadLastDeck());
  refresh();
}

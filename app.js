const state = {
  step: 1,
  plushName: "Magnolia Puff",
  coatPattern: "piebald",
  coatColor: "jet_black",
  fabricType: "minky",
  maneStyle: "long_flowing",
  maneColor: "black",
  tailColor: "black",
  featherColor: "white",
  eyeStyle: "button",
  expressionStyle: "happy",
  hairLength: 92,
  fluffiness: 80,
  accessory: "flower",
};

const labels = {
  coatPattern: {
    piebald: "piebald black-and-cream",
    skewbald: "skewbald chestnut-and-cream",
    midnight: "midnight deep-black",
    misty_roan: "misty roan slate-gray",
  },
  coatColor: {
    jet_black: "jet black coat",
    chestnut: "warm chestnut coat",
    silver_dapple: "silver dapple coat",
    golden_bay: "golden bay coat",
    cream: "cream coat",
  },
  fabricType: {
    minky: "minky plush fabric",
    velvet: "velvet plush fabric",
    fleece: "cozy fleece fabric",
    corduroy: "corduroy plush fabric",
  },
  maneStyle: {
    long_flowing: "long flowing mane",
    waterfall: "waterfall side mane",
    braided_long: "long braided mane",
  },
  maneColor: {
    black: "black mane",
    white: "white mane",
    blonde: "blonde mane",
    brown: "brown mane",
    mixed: "mixed two-tone mane",
  },
  tailColor: {
    black: "black tail",
    white: "white tail",
    blonde: "blonde tail",
    brown: "brown tail",
    mixed: "mixed two-tone tail",
  },
  featherColor: {
    white: "white leg feathering",
    black: "black leg feathering",
    cream: "cream leg feathering",
    mixed: "mixed-color leg feathering",
  },
  eyeStyle: {
    button: "button eyes",
    sparkle: "sparkle safety eyes",
    embroidered: "embroidered sleepy eyes",
  },
  expressionStyle: {
    happy: "happy smile",
    shy: "shy blush expression",
    wink: "playful wink expression",
  },
  accessory: {
    flower: "flower crown",
    bow: "satin bow",
    bandana: "scout bandana",
    tag: "name tag charm",
    none: "no accessory",
  },
};

const els = {
  stepperItems: Array.from(document.querySelectorAll("#stepper .step")),
  stepCards: [1, 2, 3].map((n) => document.getElementById(`step${n}`)),
  prevStep: document.getElementById("prevStep"),
  nextStep: document.getElementById("nextStep"),

  plushName: document.getElementById("plushName"),
  coatPattern: document.getElementById("coatPattern"),
  coatColor: document.getElementById("coatColor"),
  fabricType: document.getElementById("fabricType"),
  maneStyle: document.getElementById("maneStyle"),
  maneColor: document.getElementById("maneColor"),
  tailColor: document.getElementById("tailColor"),
  featherColor: document.getElementById("featherColor"),
  eyeStyle: document.getElementById("eyeStyle"),
  expressionStyle: document.getElementById("expressionStyle"),
  hairLength: document.getElementById("hairLength"),
  hairLengthValue: document.getElementById("hairLengthValue"),
  fluffiness: document.getElementById("fluffiness"),
  fluffinessValue: document.getElementById("fluffinessValue"),
  accessory: document.getElementById("accessory"),

  apiKey: document.getElementById("apiKey"),
  model: document.getElementById("model"),
  aspectRatio: document.getElementById("aspectRatio"),

  summaryText: document.getElementById("summaryText"),
  previewImage: document.getElementById("previewImage"),
  previewPlaceholder: document.getElementById("previewPlaceholder"),
  buildVannerBtn: document.getElementById("buildVannerBtn"),
  statusText: document.getElementById("statusText"),

  heroSection: document.getElementById("heroSection"),
  builderLayout: document.getElementById("builderLayout"),
  completionView: document.getElementById("completionView"),
  completionImage: document.getElementById("completionImage"),
  completionCaption: document.getElementById("completionCaption"),
  startOverBtn: document.getElementById("startOverBtn"),
  footerNote: document.getElementById("footerNote"),
};

const REFERENCE_IMAGE_PATH = "default-plush-reference.png";
const FIXED_SCENE = "gift shop shelf display";
const FIXED_CONTEXT = "visitor keepsake design experience";
const FIXED_ART_DIRECTION =
  "Cute collectible plush doll product render, stitched toy texture, rounded toy proportions, playful souvenir catalog look, child-friendly.";

let inFlightController = null;
let isGenerating = false;
let referenceImagePartPromise = null;
let hasGeneratedPreview = false;

function setStatus(message, kind = "") {
  els.statusText.textContent = message;
  if (kind) {
    els.statusText.dataset.state = kind;
  } else {
    delete els.statusText.dataset.state;
  }
}

function clampStep(step) {
  return Math.max(1, Math.min(3, step));
}

function renderStep() {
  state.step = clampStep(state.step);

  els.stepperItems.forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.step) === state.step);
  });

  els.stepCards.forEach((card, index) => {
    card.classList.toggle("active", index + 1 === state.step);
  });

  els.prevStep.disabled = state.step === 1;
  els.nextStep.textContent = state.step < 3 ? "Next" : "Generate Plush Preview";
  els.nextStep.disabled = false;
}

function pullStateFromInputs() {
  state.plushName = els.plushName.value.trim() || "Unnamed Plush";
  state.coatPattern = els.coatPattern.value;
  state.coatColor = els.coatColor.value;
  state.fabricType = els.fabricType.value;
  state.maneStyle = els.maneStyle.value;
  state.maneColor = els.maneColor.value;
  state.tailColor = els.tailColor.value;
  state.featherColor = els.featherColor.value;
  state.eyeStyle = els.eyeStyle.value;
  state.expressionStyle = els.expressionStyle.value;
  state.hairLength = Number(els.hairLength.value);
  state.fluffiness = Number(els.fluffiness.value);
  state.accessory = els.accessory.value;
}

function updateSummary() {
  const name = state.plushName || "Unnamed Plush";
  const coat = labels.coatPattern[state.coatPattern];
  const coatColor = labels.coatColor[state.coatColor];
  const mane = labels.maneStyle[state.maneStyle];
  const maneColor = labels.maneColor[state.maneColor];
  const tailColor = labels.tailColor[state.tailColor];
  const featherColor = labels.featherColor[state.featherColor];

  els.summaryText.textContent = `${name}: ${coatColor}, ${coat}, ${maneColor}, ${tailColor}, ${featherColor}.`;
  els.hairLengthValue.textContent = `${state.hairLength}%`;
  els.fluffinessValue.textContent = `${state.fluffiness}%`;
}

function setBuilderVisible(visible) {
  els.heroSection.hidden = !visible;
  els.builderLayout.hidden = !visible;
  els.footerNote.hidden = !visible;
  els.completionView.hidden = visible;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function getReferenceImagePart() {
  if (referenceImagePartPromise) {
    return referenceImagePartPromise;
  }

  referenceImagePartPromise = (async () => {
    const response = await fetch(REFERENCE_IMAGE_PATH, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Reference image not found at ${REFERENCE_IMAGE_PATH}.`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || "image/png";
    const data = arrayBufferToBase64(await blob.arrayBuffer());

    return {
      inlineData: {
        mimeType,
        data,
      },
    };
  })();

  return referenceImagePartPromise;
}

function missingSelections() {
  const checks = [
    ["Plush Name", state.plushName],
    ["Coat Pattern", state.coatPattern],
    ["Coat Base Color", state.coatColor],
    ["Fabric Feel", state.fabricType],
    ["Mane Style", state.maneStyle],
    ["Mane Color", state.maneColor],
    ["Tail Color", state.tailColor],
    ["Leg Feather Color", state.featherColor],
    ["Eye Style", state.eyeStyle],
    ["Expression", state.expressionStyle],
    ["Hair Length & Fullness", String(state.hairLength)],
    ["Fluffiness", String(state.fluffiness)],
    ["Accessory", state.accessory],
  ];

  return checks
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([label]) => label);
}

function buildPrompt(kind) {
  const name = state.plushName || "Unnamed Plush";
  const qualityLine =
    kind === "final"
      ? "Make this a polished premium keepsake product shot with rich toy texture detail and balanced lighting."
      : "Create a clear concept preview image that still looks polished and toy-like.";

  return [
    "Create exactly one image.",
    "Primary subject: a stylized plush toy horse inspired by Gypsy Vanner features.",
    "Use the provided reference plush image as the core style and shape anchor.",
    "Keep the same toy-family silhouette and construction style as the reference.",
    "This must look like a stuffed toy only.",
    "Hard constraints: no realistic horse photography, no biological horse anatomy realism, no real fur detail, no humans.",
    "Required visual traits: rounded toy proportions, stitched seams, soft stuffed material, collectible plush aesthetic.",
    "Critical breed cue: keep classic Gypsy Vanner long hair styling in plush form with a long mane, full long tail, and abundant feathering on lower legs.",
    `Plush name: ${name}.`,
    `Coat pattern: ${labels.coatPattern[state.coatPattern]}.`,
    `Coat base color: ${labels.coatColor[state.coatColor]}.`,
    `Fabric: ${labels.fabricType[state.fabricType]}.`,
    "Size cue: standard hug size plush (about 16 inches).",
    `Mane style: ${labels.maneStyle[state.maneStyle]}.`,
    `Mane color: ${labels.maneColor[state.maneColor]}.`,
    `Tail color: ${labels.tailColor[state.tailColor]}.`,
    `Leg feather color: ${labels.featherColor[state.featherColor]}.`,
    `Hair length/fullness level: ${state.hairLength}% (long and dramatic).`,
    `Eye style: ${labels.eyeStyle[state.eyeStyle]}.`,
    `Expression: ${labels.expressionStyle[state.expressionStyle]}.`,
    `Fluffiness: ${state.fluffiness}% plush fullness.`,
    `Accessory: ${labels.accessory[state.accessory]}.`,
    `Backdrop scene: ${FIXED_SCENE}.`,
    `Use-case context: ${FIXED_CONTEXT}.`,
    qualityLine,
    `Aspect ratio target: ${els.aspectRatio.value}.`,
    `Art direction: ${FIXED_ART_DIRECTION}`,
  ].join("\n");
}

function extractImageData(data) {
  const parts = (data.candidates || []).flatMap((candidate) => candidate?.content?.parts || []);
  const imagePart = parts.find((part) => part?.inlineData?.data || part?.inline_data?.data);

  if (!imagePart) {
    return "";
  }

  const inline = imagePart.inlineData || imagePart.inline_data;
  const mime = inline.mimeType || inline.mime_type || "image/png";
  return `data:${mime};base64,${inline.data}`;
}

async function generateImage() {
  if (state.step < 3) {
    setStatus("Finish all 3 steps before generating a preview image.", "error");
    return;
  }

  pullStateFromInputs();
  updateSummary();

  const missing = missingSelections();
  if (missing.length) {
    setStatus(`Select all attributes before generating: ${missing.join(", ")}.`, "error");
    return;
  }

  if (isGenerating) {
    setStatus("Already generating an image. Please wait.", "loading");
    return;
  }

  const apiKey = els.apiKey.value.trim();
  if (!apiKey) {
    setStatus("Add your API key in Advanced Settings.", "error");
    return;
  }

  const prompt = buildPrompt("preview");

  let referenceImagePart;
  try {
    referenceImagePart = await getReferenceImagePart();
  } catch (error) {
    setStatus(`Reference image failed to load: ${error.message}`, "error");
    return;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${els.model.value}:generateContent`;
  const body = {
    contents: [
      {
        parts: [
          referenceImagePart,
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: els.aspectRatio.value,
      },
    },
  };

  isGenerating = true;
  els.prevStep.disabled = true;
  els.nextStep.disabled = true;
  els.nextStep.textContent = "Generating...";
  setStatus("Generating plush preview image...", "loading");

  inFlightController = new AbortController();
  const timeoutId = setTimeout(() => inFlightController.abort(), 90000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: inFlightController.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Image generation request failed.");
    }

    const imageUrl = extractImageData(data);
    if (!imageUrl) {
      throw new Error("No image returned. Try adjusting trait selections and generating again.");
    }

    els.previewImage.src = imageUrl;
    els.previewImage.hidden = false;
    els.previewPlaceholder.hidden = true;
    hasGeneratedPreview = true;
    els.buildVannerBtn.hidden = false;

    setStatus("Plush preview generated.", "success");
  } catch (error) {
    const message =
      error.name === "AbortError" ? "Request timed out. Please try again." : error.message;
    setStatus(message, "error");
  } finally {
    clearTimeout(timeoutId);
    inFlightController = null;
    isGenerating = false;
    renderStep();
  }
}

function onInputChange() {
  pullStateFromInputs();
  updateSummary();
  if (hasGeneratedPreview) {
    hasGeneratedPreview = false;
    setStatus("Traits changed. Generate a fresh preview before building.", "loading");
  }
  els.buildVannerBtn.hidden = true;
}

function wireStepButtons() {
  els.prevStep.addEventListener("click", () => {
    state.step -= 1;
    renderStep();
  });

  els.nextStep.addEventListener("click", () => {
    if (state.step < 3) {
      state.step += 1;
      renderStep();
      if (state.step === 3) {
        setStatus("All traits are selected. Click Generate Plush Preview to create the image.");
      }
      return;
    }

    generateImage();
  });
}

function wireCompletionFlow() {
  els.buildVannerBtn.addEventListener("click", () => {
    if (!hasGeneratedPreview) {
      setStatus("Generate a preview first, then build your Gypsy Vanner.", "error");
      return;
    }

    els.completionImage.src = els.previewImage.src;
    els.completionCaption.textContent =
      `${state.plushName || "Your plush"} is complete with signature Gypsy Vanner mane, tail, and feathering.`;
    setBuilderVisible(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.startOverBtn.addEventListener("click", () => {
    setBuilderVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function wireInputs() {
  const controls = [
    els.plushName,
    els.coatPattern,
    els.coatColor,
    els.fabricType,
    els.maneStyle,
    els.maneColor,
    els.tailColor,
    els.featherColor,
    els.eyeStyle,
    els.expressionStyle,
    els.hairLength,
    els.fluffiness,
    els.accessory,
  ];

  controls.forEach((control) => {
    const eventName =
      control === els.plushName || control === els.fluffiness || control === els.hairLength
        ? "input"
        : "change";
    control.addEventListener(eventName, onInputChange);
    if (eventName !== "change") {
      control.addEventListener("change", onInputChange);
    }
  });

  [els.model, els.aspectRatio].forEach((control) => {
    control.addEventListener("change", () => {
      if (hasGeneratedPreview) {
        hasGeneratedPreview = false;
        els.buildVannerBtn.hidden = true;
      }
    });
  });

}

function init() {
  setBuilderVisible(true);
  renderStep();
  pullStateFromInputs();
  updateSummary();
  wireStepButtons();
  wireCompletionFlow();
  wireInputs();
  getReferenceImagePart().catch(() => {});
  setStatus("Ready. Follow the 3 guided steps, then click Generate Plush Preview.");
}

init();

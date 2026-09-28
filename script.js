// Paste your Google Apps Script Web app URL here (Deploy > New deployment > Web app).
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbynesfdrinJojRCt74SMgHM8BQNQqdinrSp8OQt9VzqJFUjABIuEbbR7K_4F6wsKIK5/exec";
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"];

const form = document.getElementById("booking-form");
const submitButton = form.querySelector(".cta");
const receipt = document.getElementById("receipt");
const receiptLabel = document.getElementById("receipt-label");
const uploadBox = receipt.closest(".upload");
const message = document.getElementById("form-message");
const defaultReceiptText = receiptLabel.textContent;
const successOverlay = document.getElementById("success-overlay");
const successCard = successOverlay.querySelector(".card");

receipt.addEventListener("change", () => {
  const file = receipt.files[0];
  receiptLabel.textContent = file ? file.name : defaultReceiptText;
  uploadBox.removeAttribute("aria-invalid");
});

const fields = form.querySelectorAll(".field");

function isFieldValid(input) {
  return input.checkValidity() && input.value.trim() !== "";
}

// Switch the upload button to Variant 2 once name, email and phone are all filled in.
function updateUploadState() {
  uploadBox.classList.toggle("is-ready", [...fields].every(isFieldValid));
}

fields.forEach((input) => {
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    updateUploadState();
  });
});

function showMessage(text, isError) {
  message.textContent = text;
  message.classList.toggle("is-error", isError);
}

function showSuccess() {
  successOverlay.hidden = false;
  document.body.style.overflow = "hidden";
  successCard.focus();
}

function hideSuccess() {
  successOverlay.hidden = true;
  document.body.style.overflow = "";
}

// Tap outside the card, or press Escape, to close.
successOverlay.addEventListener("click", (event) => {
  if (event.target === successOverlay) hideSuccess();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !successOverlay.hidden) hideSuccess();
});

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function receiptError(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return "Sila muat naik resit dalam format JPG, PNG, HEIC atau PDF.";
  if (file.size > MAX_RECEIPT_BYTES) return "Saiz resit terlalu besar. Maksimum 5MB.";
  return null;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  let firstInvalid = null;
  fields.forEach((input) => {
    const valid = isFieldValid(input);
    if (valid) input.removeAttribute("aria-invalid");
    else input.setAttribute("aria-invalid", "true");
    if (!valid && !firstInvalid) firstInvalid = input;
  });

  const file = receipt.files[0];
  if (!file) uploadBox.setAttribute("aria-invalid", "true");

  if (firstInvalid || !file) {
    showMessage("Sila lengkapkan semua maklumat dan muat naik resit pembayaran.", true);
    (firstInvalid || receipt).focus();
    return;
  }

  const fileError = receiptError(file);
  if (fileError) {
    uploadBox.setAttribute("aria-invalid", "true");
    showMessage(fileError, true);
    receipt.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Menghantar...";
  showMessage("", false);

  try {
    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      receipt: { name: file.name, type: file.type, data: await readAsBase64(file) },
    };

    // text/plain keeps this a "simple" CORS request, which Apps Script requires.
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "request_failed");

    form.reset();
    receiptLabel.textContent = defaultReceiptText;
    updateUploadState();
    showSuccess();
  } catch (err) {
    console.error(err);
    showMessage("Maaf, tempahan tidak dapat dihantar. Sila cuba lagi.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Tempah Slot";
  }
});

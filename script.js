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

receipt.addEventListener("change", () => {
  const file = receipt.files[0];
  receiptLabel.textContent = file ? file.name : defaultReceiptText;
  uploadBox.classList.toggle("has-file", Boolean(file));
  uploadBox.removeAttribute("aria-invalid");
});

form.querySelectorAll(".field").forEach((input) => {
  input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
});

function showMessage(text, isError) {
  message.textContent = text;
  message.classList.toggle("is-error", isError);
}

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
  form.querySelectorAll(".field").forEach((input) => {
    const valid = input.checkValidity() && input.value.trim() !== "";
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

    showMessage("Terima kasih! Tempahan anda telah diterima. Kami akan menghubungi anda tidak lama lagi.", false);
    form.reset();
    receiptLabel.textContent = defaultReceiptText;
    uploadBox.classList.remove("has-file");
  } catch (err) {
    console.error(err);
    showMessage("Maaf, tempahan tidak dapat dihantar. Sila cuba lagi.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Tempah Slot";
  }
});

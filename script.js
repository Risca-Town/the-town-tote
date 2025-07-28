window.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyCnCEdhJBRIOwLP_IkviuVFaIrHXHDW7ko",
    authDomain: "the-town-tote.firebaseapp.com",
    databaseURL: "https://the-town-tote-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "the-town-tote",
    storageBucket: "the-town-tote.appspot.com",
    messagingSenderId: "621734345222",
    appId: "1:621734345222:web:d49cad8ff26f84e7866187"
  };

  import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function loadPrizeAmount() {
  const prizeRef = doc(db, "site_settings", "current_prize");
  const prizeSnap = await getDoc(prizeRef);
  if (prizeSnap.exists()) {
    const amount = prizeSnap.data().amount;
    document.getElementById("prize-amount").textContent = `£${amount}`;
  } else {
    document.getElementById("prize-amount").textContent = "Unavailable";
  }
}

loadPrizeAmount();

  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const luckyDipCountInput = document.getElementById("luckyDipCount");
  const luckyDipEntriesDisplay = document.getElementById("luckyDipEntries");
  const submitBtn = document.getElementById("submitBtn");
  const generateLuckyDipBtn = document.getElementById("generateLuckyDipBtn");
  const addTicketBtn = document.getElementById("addTicketBtn");
  const ticketContainer = document.getElementById("ticketContainer");
  const errorDiv = document.getElementById("error");
  const paymentAmount = document.getElementById("paymentAmount");

  let luckyDipActive = false;
  let ticketCount = 0;
  const MAX_TICKETS = 5;

  // Utility: Create unique ticket IDs
  function generateTicketId() {
    return 'ticket-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  // Manual Ticket UI Generator
  function createTicketGroup() {
    if (ticketCount >= MAX_TICKETS) return;

    const ticketId = generateTicketId();
    const group = document.createElement("div");
    group.classList.add("manual-ticket-group");
    group.setAttribute("data-ticket-id", ticketId);

    const grid = document.createElement("div");
    grid.classList.add("number-grid");

    const selected = new Set();

    for (let i = 1; i <= 24; i++) {
      const btn = document.createElement("div");
      btn.classList.add("number");
      btn.innerText = i;

      btn.addEventListener("click", () => {
        if (luckyDipActive || btn.classList.contains("disabled")) return;

        const value = parseInt(btn.innerText, 10);
        if (selected.has(value)) {
          selected.delete(value);
          btn.classList.remove("selected");
        } else {
          if (selected.size >= 4) {
            errorDiv.innerText = "Each ticket must have exactly 4 numbers.";
            return;
          }
          selected.add(value);
          btn.classList.add("selected");
        }
        errorDiv.innerText = "";
        updatePayment();
      });

      grid.appendChild(btn);
    }

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("remove-ticket-btn");
    removeBtn.innerText = "Remove Ticket";
    removeBtn.addEventListener("click", () => {
      ticketContainer.removeChild(group);
      ticketCount--;
      updatePayment();
      toggleAddTicketButton();
    });

    group.appendChild(grid);
    group.appendChild(removeBtn);
    group._selectedNumbers = selected;
    ticketContainer.appendChild(group);

    ticketCount++;
    updatePayment();
    toggleAddTicketButton();
  }

  function toggleAddTicketButton() {
    addTicketBtn.disabled = ticketCount >= MAX_TICKETS || luckyDipActive;
  }

  function getManualTicketData() {
    const groups = ticketContainer.querySelectorAll(".manual-ticket-group");
    const allTickets = [];

    for (let group of groups) {
      const selected = [];
      group.querySelectorAll(".number.selected").forEach(btn => {
        selected.push(parseInt(btn.textContent));
      });

      if (selected.length !== 4) {
        throw new Error("Each manual ticket must have exactly 4 numbers.");
      }

      allTickets.push(selected);
    }

    return allTickets;
  }

  function generateLuckyDipNumbers() {
    const numbers = new Set();
    while (numbers.size < 4) {
      numbers.add(Math.floor(Math.random() * 24) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }

  function generateLuckyDip() {
    const count = parseInt(luckyDipCountInput.value, 10);
    if (isNaN(count) || count < 1 || count > 10) {
      errorDiv.innerText = "Please enter a valid number of Lucky Dip tickets (1–10).";
      return;
    }

    luckyDipActive = true;
    ticketContainer.innerHTML = "";
    ticketCount = 0;
    toggleAddTicketButton();

    const entries = [];
    for (let i = 0; i < count; i++) {
      entries.push(generateLuckyDipNumbers().join(", "));
    }

    luckyDipEntriesDisplay.textContent = `Lucky Dip Entries: ${entries.join(" | ")}`;
    updatePayment();
    errorDiv.innerText = "";
  }

  function updatePayment() {
    const count = luckyDipActive
      ? parseInt(luckyDipCountInput.value, 10) || 0
      : ticketContainer.querySelectorAll(".manual-ticket-group").length;

    paymentAmount.textContent = `Payment: £${count}`;
    submitBtn.textContent = `Submit Entry (£${count})`;
  }

  function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  async function submitEntry() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const transactionIdBase = Date.now().toString() + Math.random().toString(36).substring(2, 8);

    if (!name || !isValidEmail(email)) {
      errorDiv.innerText = "Please enter a valid name and email.";
      return;
    }

    let tickets = [];

    try {
      if (luckyDipActive) {
        const count = parseInt(luckyDipCountInput.value, 10);
        if (!count || count < 1) {
          throw new Error("Enter a valid number of lucky dip tickets.");
        }

        for (let i = 0; i < count; i++) {
          tickets.push({
            name,
            email,
            selectedNumbers: generateLuckyDipNumbers(),
            selectionMethod: "luckyDip",
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            transactionId: `${transactionIdBase}-${i + 1}`
          });
        }
      } else {
        const manualTickets = getManualTicketData();
        for (let i = 0; i < manualTickets.length; i++) {
          tickets.push({
            name,
            email,
            selectedNumbers: manualTickets[i],
            selectionMethod: "picked",
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            transactionId: `${transactionIdBase}-${i + 1}`
          });
        }
      }
    } catch (err) {
      errorDiv.innerText = err.message;
      return;
    }

    try {
      submitBtn.disabled = true;
      await Promise.all(tickets.map(data => db.collection("lottery_entries").add(data)));
      errorDiv.innerText = `Your ${tickets.length} ticket(s) have been submitted! Good luck!`;

      // Reset form
      document.getElementById("name").value = "";
      document.getElementById("email").value = "";
      luckyDipActive = false;
      luckyDipCountInput.value = "";
      luckyDipEntriesDisplay.textContent = "";
      ticketContainer.innerHTML = "";
      ticketCount = 0;
      createTicketGroup();
      updatePayment();
      toggleAddTicketButton();
    } catch (e) {
      console.error("Submission error:", e);
      errorDiv.innerText = "An error occurred while submitting your entry.";
    } finally {
      submitBtn.disabled = false;
    }
  }

  // Initial setup
  createTicketGroup();
  updatePayment();

  // Bind events
  addTicketBtn.addEventListener("click", () => {
    if (ticketCount >= MAX_TICKETS || luckyDipActive) return;
    createTicketGroup();
  });

  generateLuckyDipBtn.addEventListener("click", generateLuckyDip);

  luckyDipCountInput.addEventListener("input", () => {
    luckyDipActive = parseInt(luckyDipCountInput.value, 10) > 0;
    toggleAddTicketButton();
    updatePayment();
    if (!luckyDipActive) luckyDipEntriesDisplay.textContent = "";
  });

  submitBtn.addEventListener("click", submitEntry);
});

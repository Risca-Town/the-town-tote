window.addEventListener("DOMContentLoaded", async () => {
  const firebaseConfig = {
    apiKey: "AIzaSyCnCEdhJBRIOwLP_IkviuVFaIrHXHDW7ko",
    authDomain: "the-town-tote.firebaseapp.com",
    databaseURL: "https://the-town-tote-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "the-town-tote",
    storageBucket: "the-town-tote.appspot.com",
    messagingSenderId: "621734345222",
    appId: "1:621734345222:web:d49cad8ff26f84e7866187"
  };

  // Firebase modular imports
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js");
  const {
    getFirestore,
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp
  } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Load prize amount
  async function loadPrizeAmount() {
    try {
      const prizeRef = doc(db, "site_settings", "current_prize");
      const prizeSnap = await getDoc(prizeRef);
      if (prizeSnap.exists()) {
        const data = prizeSnap.data();
        const amount = data.amount;
        if (typeof amount === "number" && !isNaN(amount)) {
          document.getElementById("prize-amount").textContent = `£${amount}`;
        } else {
          document.getElementById("prize-amount").textContent = "Unavailable";
        }
      } else {
        document.getElementById("prize-amount").textContent = "Unavailable";
      }
    } catch (e) {
      console.error("Error loading prize:", e);
      document.getElementById("prize-amount").textContent = "Unavailable";
    }
  }

  await loadPrizeAmount(); // Call after Firebase is ready

  // DOM references
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

  function generateTicketId() {
    return 'ticket-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function createTicketGroup() {
    if (ticketCount >= MAX_TICKETS) return;

    const ticketId = generateTicketId();
    const group = document.createElement("div");
    group.classList.add("manual-ticket-group");
    group.dataset.ticketId = ticketId;

    const grid = document.createElement("div");
    grid.classList.add("number-grid");

    const selected = new Set();

    for (let i = 1; i <= 24; i++) {
      const btn = document.createElement("div");
      btn.classList.add("number");
      btn.textContent = i;

      btn.addEventListener("click", () => {
        if (luckyDipActive || btn.classList.contains("disabled")) return;

        const val = parseInt(btn.textContent, 10);
        if (selected.has(val)) {
          selected.delete(val);
          btn.classList.remove("selected");
        } else {
          if (selected.size >= 4) {
            errorDiv.textContent = "Each ticket must have exactly 4 numbers.";
            return;
          }
          selected.add(val);
          btn.classList.add("selected");
        }
        errorDiv.textContent = "";
        updatePayment();
      });

      grid.appendChild(btn);
    }

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("remove-ticket-btn");
    removeBtn.textContent = "Remove Ticket";
    removeBtn.type = "button";
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

    for (const group of groups) {
      const selectedNumbers = [];
      group.querySelectorAll(".number.selected").forEach(btn => {
        selectedNumbers.push(parseInt(btn.textContent, 10));
      });

      if (selectedNumbers.length !== 4) {
        throw new Error("Each manual ticket must have exactly 4 numbers.");
      }

      allTickets.push(selectedNumbers);
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
      errorDiv.textContent = "Please enter a valid number of Lucky Dip tickets (1–10).";
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
    errorDiv.textContent = "";
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
    errorDiv.textContent = "";
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const transactionIdBase = Date.now().toString() + Math.random().toString(36).slice(2, 8);

    if (!name || !isValidEmail(email)) {
      errorDiv.textContent = "Please enter a valid name and email.";
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
            timestamp: serverTimestamp(),
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
            timestamp: serverTimestamp(),
            transactionId: `${transactionIdBase}-${i + 1}`
          });
        }
      }
    } catch (err) {
      errorDiv.textContent = err.message;
      return;
    }

    try {
      submitBtn.disabled = true;
      await Promise.all(tickets.map(ticket => addDoc(collection(db, "lottery_entries"), ticket)));
      errorDiv.textContent = `Your ${tickets.length} ticket(s) have been submitted! Good luck!`;

      // Reset form
      document.getElementById("name").value = "";
      document.getElementById("email").value = "";
      luckyDipActive = false;
      luckyDipCountInput.value = "";
      luckyDipEntriesDisplay.textContent = "";
      ticketContainer.innerHTML = "";
      ticketCount = 0;
      createTicketGroup(); // recreate one ticket on reset
      updatePayment();
      toggleAddTicketButton();
    } catch (e) {
      console.error("Submission error:", e);
      errorDiv.textContent = "An error occurred while submitting your entry.";
    } finally {
      submitBtn.disabled = false;
    }
  }

  // 🔧 INITIAL SETUP ON PAGE LOAD
  createTicketGroup(); // Show 1 ticket picker
  updatePayment();
  toggleAddTicketButton();

  // 🔗 Event bindings
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

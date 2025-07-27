window.addEventListener("DOMContentLoaded", () => {
  console.log("Hello from The Town Tote's JavaScript! (Step 1)");

  // --- Firebase Initialization ---
  const firebaseConfig = {
    apiKey: "AIzaSyCnCEdhJBRIOwLP_IkviuVFaIrHXHDW7ko",
    authDomain: "the-town-tote.firebaseapp.com",
    databaseURL: "https://the-town-tote-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "the-town-tote",
    storageBucket: "the-town-tote.firebasestorage.app",
    messagingSenderId: "621734345222",
    appId: "1:621734345222:web:d49cad8ff26f84e7866187"
  };

  console.log("Attempting to initialize Firebase app... (Step 2)");
  const app = firebase.initializeApp(firebaseConfig);
  console.log("Firebase app initialized. Attempting to get Firestore reference... (Step 3)");
  const db = firebase.firestore();
  console.log("Firestore reference obtained. Attempting to write test document... (Step 4)");

  db.collection("connection_tests").add({
    message: "The Town Tote app is connected to Firestore!",
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
    .then((docRef) => {
      console.log("SUCCESS! Test document written to Firestore with ID: ", docRef.id);
    })
    .catch((error) => {
      console.error("ERROR! Failed to write test document: ", error);
    });

  // --- UI Element References ---
  const grid = document.getElementById("numberGrid");
  const selectedNumbers = new Set();
  const luckyDipCountInput = document.getElementById("luckyDipCount");
  const paymentAmount = document.getElementById("paymentAmount");
  const submitBtn = document.getElementById("submitBtn");
  const generateLuckyDipBtn = document.getElementById("generateLuckyDipBtn");
  const errorDiv = document.getElementById("error");

  let luckyDipActive = false;
  let numberButtons = [];

  // --- Number Grid Creation ---
  for (let i = 1; i <= 24; i++) {
    const btn = document.createElement("div");
    btn.classList.add("number");
    btn.innerText = i;

    btn.onclick = () => {
      if (luckyDipActive || btn.classList.contains('disabled')) return;
      if (selectedNumbers.has(i)) {
        selectedNumbers.delete(i);
        btn.classList.remove("selected");
      } else {
        if (selectedNumbers.size >= 4) {
          errorDiv.innerText = "You can only pick 4 numbers.";
          return;
        }
        selectedNumbers.add(i);
        btn.classList.add("selected");
        errorDiv.innerText = "";
      }
      updateControls();
    };

    grid.appendChild(btn);
    numberButtons.push(btn);
  }

  // --- UI State Updater ---
  function updateControls() {
    if (selectedNumbers.size === 4) {
      luckyDipCountInput.disabled = true;
      generateLuckyDipBtn.disabled = true;
    } else {
      luckyDipCountInput.disabled = false;
      generateLuckyDipBtn.disabled = false;
    }
    numberButtons.forEach(btn => {
      btn.classList.toggle('disabled', luckyDipActive);
    });
    updatePayment();
  }

  function updatePayment() {
    let count = luckyDipActive ? parseInt(luckyDipCountInput.value, 10) || 0 : 0;
    if (!luckyDipActive && selectedNumbers.size === 4) count = 1;
    paymentAmount.textContent = `Payment: £${count * 1}`;
    submitBtn.textContent = `Submit Entry (£${count * 1})`;
  }

  // --- Lucky Dip ---
  luckyDipCountInput.addEventListener("input", () => {
    if (parseInt(luckyDipCountInput.value, 10) === 0) {
      luckyDipActive = false;
      document.getElementById("luckyDipEntries").textContent = "";
      numberButtons.forEach(btn => btn.classList.remove('disabled'));
      updateControls();
    } else {
      updatePayment();
    }
  });

  function generateLuckyDipNumbers() {
    const numbers = [];
    while (numbers.length < 4) {
      let n = Math.floor(Math.random() * 24) + 1;
      if (!numbers.includes(n)) {
        numbers.push(n);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  function generateLuckyDip() {
    const count = parseInt(luckyDipCountInput.value, 10) || 0;
    if (count < 1) {
      errorDiv.innerText = "Please enter at least 1 Lucky Dip ticket.";
      return;
    }
    luckyDipActive = true;
    selectedNumbers.clear();
    numberButtons.forEach(btn => {
      btn.classList.remove('selected');
      btn.classList.add('disabled');
    });
    let entries = [];
    for (let i = 0; i < count; i++) {
      let nums = generateLuckyDipNumbers();
      entries.push(nums.join(", "));
    }
    document.getElementById("luckyDipEntries").textContent = `Lucky Dip Entries: ${entries.join(" | ")}`;
    errorDiv.innerText = "";
    updateControls();
  }

  // --- Submission Logic ---
  function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }

  function submitEntry() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();

    errorDiv.innerText = "";

    if (name === "" || email === "" || !isValidEmail(email)) {
      errorDiv.innerText = "Please enter a valid name and email.";
      return;
    }

    let numTicketsToSave = 1;
    let actualSelectedNumbers = Array.from(selectedNumbers);

    if (luckyDipActive) {
      numTicketsToSave = parseInt(luckyDipCountInput.value, 10);
      if (isNaN(numTicketsToSave) || numTicketsToSave <= 0) {
        errorDiv.innerText = "Please enter a valid number of lucky dips.";
        return;
      }
    } else {
      if (actualSelectedNumbers.length !== 4) {
        errorDiv.innerText = "Please select exactly 4 numbers.";
        return;
      }
    }

    const transactionId = Date.now().toString() + Math.random().toString(36).substring(2, 8);
    const savePromises = [];
    submitBtn.disabled = true;

    for (let i = 0; i < numTicketsToSave; i++) {
      let ticketNumbers = luckyDipActive ? generateLuckyDipNumbers() : actualSelectedNumbers;
      let ticketSelectionMethod = luckyDipActive ? "luckyDip" : "picked";

      const ticketData = {
        name,
        email,
        selectedNumbers: ticketNumbers,
        selectionMethod: ticketSelectionMethod,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        transactionId
      };

      savePromises.push(db.collection("lottery_entries").add(ticketData));
    }

    Promise.allSettled(savePromises)
      .then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length === 0) {
          errorDiv.innerText = numTicketsToSave === 1
            ? "Your entry has been submitted! Good luck!"
            : `Your ${numTicketsToSave} entries have been submitted! Good luck!`;

          // Reset form
          document.getElementById("name").value = "";
          document.getElementById("email").value = "";
          selectedNumbers.clear();
          numberButtons.forEach(btn => btn.classList.remove('selected'));
          luckyDipActive = false;
          luckyDipCountInput.value = "";
          document.getElementById("luckyDipEntries").textContent = "";
          updateControls();
        } else {
          errorDiv.innerText = `Failed to submit some entries. Please try again. (${failed.length} failed)`;
          console.error("Some entries failed to save:", failed);
        }
      })
      .catch(error => {
        console.error("Unexpected error during save:", error);
        errorDiv.innerText = "An unexpected error occurred. Please try again.";
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  }

  // --- Attach Button Handlers ---
  generateLuckyDipBtn.addEventListener("click", generateLuckyDip);
  submitBtn.addEventListener("click", submitEntry);
});

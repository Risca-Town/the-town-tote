    console.log("Hello from The Town Tote's JavaScript! (Step 1)"); // This should appear first

    const firebaseConfig = {
    apiKey: "AIzaSyCnCEdhJBRIOwLP_IkviuVFaIrHXHDW7ko",
    authDomain: "the-town-tote.firebaseapp.com",
    databaseURL: "https://the-town-tote-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "the-town-tote",
    storageBucket: "the-town-tote.firebasestorage.app",
    messagingSenderId: "621734345222",
    appId: "1:621734345222:web:d49cad8ff26f84e7866187"
  };
    // --- ADD THESE TWO LINES HERE! ---
    console.log("Attempting to initialize Firebase app... (Step 2)");
    const app = firebase.initializeApp(firebaseConfig); // This line starts Firebase using your config
    console.log("Firebase app initialized. Attempting to get Firestore reference... (Step 3)");
    const db = firebase.firestore(); // This line gets you the Firestore database object
    console.log("Firestore reference obtained. Attempting to write test document... (Step 4)");

    // --- TEST: This will try to write a document to Firestore ---
    db.collection("connection_tests").add({
        message: "The Town Tote app is connected to Firestore!",
        timestamp: firebase.firestore.FieldValue.serverTimestamp() // Firestore automatically adds this
    })
    .then((docRef) => {
        console.log("SUCCESS! Test document written to Firestore with ID: ", docRef.id); // This should appear if successful
    })
    .catch((error) => {
        console.error("ERROR! Failed to write test document: ", error); // This will appear if there's an error
    });
    // --- END TEST ---


    const grid = document.getElementById("numberGrid"); // This line will only work if the numberGrid element is present in your HTML
    const selectedNumbers = new Set();
    const luckyDipCountInput = document.getElementById("luckyDipCount");
    const paymentAmount = document.getElementById("paymentAmount");
    const submitBtn = document.getElementById("submitBtn");
    const generateLuckyDipBtn = document.getElementById("generateLuckyDipBtn");

    let luckyDipActive = false;
    let numberButtons = [];

    // Create number grid
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
            document.getElementById("error").innerText = "You can only pick 4 numbers.";
            return;
          }
          selectedNumbers.add(i);
          btn.classList.add("selected");
          document.getElementById("error").innerText = "";
        }
        updateControls();
      };

      grid.appendChild(btn);
      numberButtons.push(btn);
    }

    function updateControls() {
      // If 4 numbers are picked, disable Lucky Dip controls
      if (selectedNumbers.size === 4) {
        luckyDipCountInput.disabled = true;
        generateLuckyDipBtn.disabled = true;
      } else {
        luckyDipCountInput.disabled = false;
        generateLuckyDipBtn.disabled = false;
      }
      // If Lucky Dip is active, disable number buttons
      numberButtons.forEach(btn => {
        if (luckyDipActive) {
          btn.classList.add('disabled');
        } else {
          btn.classList.remove('disabled');
        }
      });
      // Update payment
      updatePayment();
    }

    function updatePayment() {
      let count = luckyDipActive ? parseInt(luckyDipCountInput.value, 10) || 0 : 0;
      if (!luckyDipActive && selectedNumbers.size === 4) count = 1;
      paymentAmount.textContent = `Payment: £${count}`;
      submitBtn.textContent = `Submit Entry (£${count})`;
    }

    luckyDipCountInput.addEventListener("input", () => {
      // If user sets lucky dip back to 0, reset lucky dip mode
      if (parseInt(luckyDipCountInput.value, 10) === 0) {
        luckyDipActive = false;
        document.getElementById("luckyDipEntries").textContent = "";
        numberButtons.forEach(btn => btn.classList.remove('disabled'));
        updateControls();
      } else {
        updatePayment();
      }
    });

    function generateLuckyDip() {
      const count = parseInt(luckyDipCountInput.value, 10) || 0;
      if (count < 1) {
        document.getElementById("error").innerText = "Please enter at least 1 Lucky Dip ticket.";
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
        let nums = [];
        while (nums.length < 4) {
          let n = Math.floor(Math.random() * 24) + 1;
          if (!nums.includes(n)) nums.push(n);
        }
        entries.push(nums.sort((a, b) => a - b).join(", "));
      }
      document.getElementById("luckyDipEntries").textContent = `Lucky Dip Entries: ${entries.join(" | ")}`;
      document.getElementById("error").innerText = "";
      updateControls();
    }
// ... (your existing code above this point) ...

    function submitEntry() {
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const luckyDipCount = luckyDipActive ? (parseInt(luckyDipCountInput.value, 10) || 0) : 0;
      const numbers = Array.from(selectedNumbers).sort((a, b) => a - b);
      const errorDiv = document.getElementById("error"); // Get the error div for feedback

      errorDiv.innerText = ""; // Clear previous errors

      if (name === "" || email === "") {
        errorDiv.innerText = "Please enter your name and email.";
        return;
      }

      let entryData = {}; // This object will hold the data we send to Firestore

      if (luckyDipActive) {
        if (luckyDipCount < 1) {
          errorDiv.innerText = "Please enter at least 1 Lucky Dip ticket.";
          return;
        }
        // Data for a Lucky Dip entry
        entryData = {
          type: "Lucky Dip",
          name: name,
          email: email,
          luckyDipTickets: luckyDipCount,
          luckyDipEntries: document.getElementById("luckyDipEntries").textContent, // Store the displayed string
          timestamp: firebase.firestore.FieldValue.serverTimestamp() // Firestore adds server timestamp
        };
        // You might want to remove the alert and show a success message on the page instead
        // alert(`Name: ${name}\nEmail: ${email}\nLucky Dips: ${luckyDipCount}\nEntries: ${document.getElementById("luckyDipEntries").textContent}\nPayment: £${luckyDipCount}`);
      } else {
        if (numbers.length !== 4) {
          errorDiv.innerText = "Please select exactly 4 numbers.";
          return;
        }
        // Data for a manual number entry
        entryData = {
          type: "Manual Pick",
          name: name,
          email: email,
          selectedNumbers: numbers,
          timestamp: firebase.firestore.FieldValue.serverTimestamp() // Firestore adds server timestamp
        };
        // alert(`Name: ${name}\nEmail: ${email}\nNumbers: ${numbers.join(", ")}\nPayment: £1`);
      }
let numTicketsToSave = 1; // Default to 1 for picked numbers
let actualSelectedNumbers = Array.from(selectedNumbers); // Convert Set to Array for picked numbers

if (luckyDipActive) {
    numTicketsToSave = parseInt(luckyDipCountInput.value, 10); // Get count from input field
    if (isNaN(numTicketsToSave) || numTicketsToSave <= 0) {
        errorDiv.innerText = "Please enter a valid number of lucky dips.";
        return; // Stop the submission if invalid
    }
} else if (actualSelectedNumbers.length !== 4) { // Only check if not lucky dip
    errorDiv.innerText = "Please select exactly 4 numbers.";
    return; // Stop the submission if numbers aren't selected
}

// Generate a unique ID for this entire purchase batch (useful for single email confirmation)
const transactionId = Date.now().toString() + Math.random().toString(36).substring(2, 8);

const savePromises = []; // This array will hold a "promise" for each ticket we try to save

// Loop 'numTicketsToSave' times to create and save each individual ticket
for (let i = 0; i < numTicketsToSave; i++) {
    let ticketNumbers;
    let ticketSelectionMethod;

    if (luckyDipActive) {
        ticketNumbers = generateLuckyDipNumbers(); // Generate *new, unique* numbers for EACH lucky dip ticket
        ticketSelectionMethod = "luckyDip";
    } else {
        // If user picked numbers, use those same numbers for each ticket in the batch
        ticketNumbers = actualSelectedNumbers;
        ticketSelectionMethod = "picked";
    }

    // Prepare the data for THIS specific ticket
    const ticketData = {
        name: document.getElementById("name").value, // Get name from form
        email: document.getElementById("email").value, // Get email from form
        selectedNumbers: ticketNumbers,
        selectionMethod: ticketSelectionMethod,
        timstamp: firebase.firestore.FieldValue.serverTimestamp(), // Use v8 syntax for serverTimestamp
        transactionId: transactionId // Link all tickets in this batch to the same purchase ID
    };

    // Add the promise returned by db.collection().add() to our array
    savePromises.push(
        db.collection("lottery_entries").add(ticketData)
    );
}

// --- Now, wait for ALL the tickets to finish saving ---
Promise.allSettled(savePromises)
    .then((results) => {
        // Count how many saves failed
        const failedSaves = results.filter(result => result.status === 'rejected');

        if (failedSaves.length === 0) {
            console.log(`SUCCESS: All ${numTicketsToSave} lottery entry tickets successfully saved for transaction ID: ${transactionId}`);
            errorDiv.innerText = `Your ${numTicketsToSave} entry(ies) have been submitted! Good luck!`;

            // --- Clear the form and reset UI after successful submission ---
            document.getElementById("name").value = "";
            document.getElementById("email").value = "";
            selectedNumbers.clear(); // Clear selected numbers Set
            numberButtons.forEach(btn => btn.classList.remove('selected')); // Deselect number buttons
            luckyDipActive = false; // Reset lucky dip mode
            luckyDipCountInput.value = ""; // Clear lucky dip count input
            document.getElementById("luckyDipEntries").textContent = ""; // Clear lucky dip display
            updateControls(); // Call your existing UI update function

            // --- IMPORTANT: This is where you would call your SINGLE email confirmation function ---
            // You would pass the email, name, transactionId, and maybe all the generated ticket numbers
            // that you could collect inside the loop if you needed them for the email content.
            // Example: sendConfirmationEmail(document.getElementById("email").value, document.getElementById("name").value, transactionId, results.map(r => r.value));
        } else {
            console.error(`ERROR: ${failedSaves.length} out of ${numTicketsToSave} tickets failed to save.`, failedSaves);
            errorDiv.innerText = `Failed to submit some entries. Please try again. (${failedSaves.length} failed)`;
        }
    })
    .catch((error) => {
        // This catch block would only activate if `Promise.allSettled` itself fails unexpectedly
        console.error("CRITICAL ERROR: An unexpected error occurred during batch save processing:", error);
        errorDiv.innerText = "An unexpected error occurred during submission. Please check console.";
    });
    }

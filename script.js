<script>
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

      // --- NEW: SAVE THE ENTRY TO FIRESTORE! ---
      db.collection("lottery_entries").add(entryData)
        .then((docRef) => {
          console.log("Lottery entry successfully saved with ID: ", docRef.id);
          errorDiv.innerText = "Your entry has been submitted! Good luck!";
          // Optional: Clear the form after successful submission
          document.getElementById("name").value = "";
          document.getElementById("email").value = "";
          selectedNumbers.clear(); // Clear selected numbers
          numberButtons.forEach(btn => btn.classList.remove('selected')); // Deselect numbers
          luckyDipActive = false; // Reset lucky dip mode
          luckyDipCountInput.value = ""; // Clear lucky dip count
          document.getElementById("luckyDipEntries").textContent = ""; // Clear lucky dip display
          updateControls(); // Update UI
        })
        .catch((error) => {
          console.error("Error saving lottery entry: ", error);
          errorDiv.innerText = "Failed to submit entry. Please try again.";
        });
    }

    // ... (your existing code below this point) ...

  </script>

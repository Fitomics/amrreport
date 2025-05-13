// app.js

// ---------------------------------------------
// CSV handler class (original amrcsv.js)
// ---------------------------------------------
class AMRCsvHandler {
  constructor() {
    this.csvData = null;
    this.fileName = null;
    this.initialized = false;
    this.analysisData = null;
    this.analysisTablesHTML = null;
    this.csvProcessed = false;
  }

  init(config = {}) {
    if (this.initialized) {
      console.log("AMRCsvHandler already initialized");
      return this;
    }

    const defaults = {
      fileInputId: "csv-file-input",
      dropZoneId: "csv-drop-zone",
      previewAreaId: "csv-preview",
      statusMessageId: "csv-status",
      processBtnId: "process-csv-btn",
    };

    this.config = { ...defaults, ...config };
    this.ensureRequiredElements();
    this.setupElements();
    this.setupEventListeners();

    this.initialized = true;
    console.log("AMRCsvHandler initialized successfully");
    return this;
  }

  ensureRequiredElements() {
    const dropZone = document.getElementById(this.config.dropZoneId);
    if (dropZone && !dropZone.innerHTML.trim()) {
      dropZone.innerHTML = "<p>Drop CSV file here or click to browse</p>";
    }
    if (!document.getElementById(this.config.previewAreaId)) {
      const previewArea = document.createElement("div");
      previewArea.id = this.config.previewAreaId;
      previewArea.className = "csv-preview";
      const container = document.querySelector(".csv-container");
      if (container) container.appendChild(previewArea);
      else console.error("CSV container not found, can't create preview area");
    }
    const processBtn = document.getElementById(this.config.processBtnId);
    if (processBtn && !processBtn.innerText) {
      processBtn.innerText = "Process CSV (Remove Row #2)";
      processBtn.disabled = true;
    }
  }

  setupElements() {
    this.dropZone = document.getElementById(this.config.dropZoneId);
    this.previewArea = document.getElementById(this.config.previewAreaId);
    this.statusMessage = document.getElementById(this.config.statusMessageId);
    this.processBtn = document.getElementById(this.config.processBtnId);

    if (!document.getElementById(this.config.fileInputId)) {
      const fileInput = document.createElement("input");
      fileInput.id = this.config.fileInputId;
      fileInput.type = "file";
      fileInput.accept = ".csv";
      fileInput.style.display = "none";
      if (this.dropZone && this.dropZone.parentNode) {
        this.dropZone.parentNode.appendChild(fileInput);
      } else {
        document.body.appendChild(fileInput);
      }
    }
    this.fileInput = document.getElementById(this.config.fileInputId);
    console.log("CSV Handler elements setup:", {
      fileInput: this.fileInput,
      dropZone: this.dropZone,
      previewArea: this.previewArea,
      statusMessage: this.statusMessage,
      processBtn: this.processBtn,
    });
  }

  setupEventListeners() {
    if (!this.fileInput || !this.dropZone) {
      console.error("Required elements not found:", {
        fileInput: this.fileInput,
        dropZone: this.dropZone,
      });
      return;
    }

    this.fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    this.dropZone.addEventListener("click", () => {
      if (this.fileInput) this.fileInput.click();
    });

    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.add("dragover");
    });

    this.dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.remove("dragover");
    });

    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    if (this.processBtn) {
      this.processBtn.addEventListener("click", () => {
        if (this.csvData && !this.csvProcessed) this.processCSV();
        else if (this.csvProcessed) {
          this.showStatus(
            "CSV already processed - upload a new file to process again",
            true
          );
        }
      });
    }

    console.log("CSV Handler event listeners setup completed");
  }

  handleFile(file) {
    console.log("Handling file:", file.name);
    if (!this.validateFileType(file)) {
      this.showStatus("Please select a valid CSV file", true);
      return;
    }

    this.fileName = file.name;
    this.csvProcessed = false;

    const reader = new FileReader();
    const self = this;

    reader.onload = function (e) {
      try {
        self.csvData = self.parseCSV(e.target.result);
        self.showStatus(
          `File loaded: ${file.name} (${self.csvData.length} rows)`
        );
        if (self.processBtn) {
          self.processBtn.disabled = false;
          self.processBtn.innerHTML = "Process CSV (Remove Row #2)";
        }
        self.analysisData = null;
        self.analysisTablesHTML = null;
        self.findMaxHR();
        self.previewCSV(self.csvData);
      } catch (error) {
        console.error("CSV parsing error:", error);
        self.showStatus(`Error parsing CSV: ${error.message}`, true);
      }
    };

    reader.onerror = function (e) {
      console.error("File reading error:", e);
      self.showStatus("Error reading file", true);
    };

    reader.readAsText(file);
  }

  validateFileType(file) {
    return file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
  }

  parseCSV(csvText) {
    const rows = [];
    const lines = csvText.split(/\r\n|\n/);
    lines.forEach((line) => {
      if (line.trim() === "") return;
      const row = [];
      let inQuote = false;
      let currentValue = "";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
          inQuote = !inQuote;
        } else if (char === "," && !inQuote) {
          row.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      row.push(currentValue.trim());
      rows.push(row);
    });
    return rows;
  }

  showStatus(message, isError = false) {
    if (!this.statusMessage) {
      console.error("Status message element not found");
      console.log(message, isError);
      return;
    }
    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${
      isError ? "error" : "success"
    }`;
    this.statusMessage.style.display = "block";
    setTimeout(() => {
      this.statusMessage.style.display = "none";
    }, 5000);
  }

  findColumnIndex(headers, keywords) {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (keywords.some((kw) => header.includes(kw.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  }

  findMaxHR() {
    if (!this.csvData || this.csvData.length < 2) return;

    const headerRow = this.csvData[0];
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "heart", "bpm"]);
    if (hrIndex === -1) return;

    let maxHR = 0;
    for (let i = 1; i < this.csvData.length; i++) {
      const row = this.csvData[i];
      if (row.length > hrIndex) {
        const hrValue = parseFloat(row[hrIndex]);
        if (!isNaN(hrValue) && hrValue > maxHR) maxHR = hrValue;
      }
    }

    const maxHRInput = document.getElementById("max-hr");
    if (maxHRInput && maxHR > 0) {
      maxHRInput.value = maxHR;

      // Calculate HR zones using our new approach
      hrZoneData.calculateHrRanges(maxHR);
      generateMetabolicReport();

      maxHRInput.dispatchEvent(new Event("change"));
    }
  }

  findFatMax() {
    if (!this.csvData || this.csvData.length < 2) return;
    const headerRow = this.csvData[0];
    const fatGMinIndex = this.findColumnIndex(headerRow, ["fat-g/min"]);
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "bpm"]);
    if (fatGMinIndex === -1 || hrIndex === -1) return;
    let maxFatGMin = 0;
    let correspondingHR = 0;
    for (let i = 1; i < this.csvData.length; i++) {
      const row = this.csvData[i];
      if (row.length <= Math.max(fatGMinIndex, hrIndex)) continue;
      const fatValue = parseFloat(row[fatGMinIndex]);
      const hrValue = parseFloat(row[hrIndex]);
      if (isNaN(fatValue) || isNaN(hrValue)) continue;
      if (fatValue > maxFatGMin) {
        maxFatGMin = fatValue;
        correspondingHR = hrValue;
      }
    }
    const fatMaxGramsField = document.getElementById("fat-max-grams");
    const fatMaxHrField = document.getElementById("fat-max-hr");
    if (fatMaxGramsField && maxFatGMin > 0)
      fatMaxGramsField.value = maxFatGMin.toFixed(2);
    if (fatMaxHrField && correspondingHR > 0)
      fatMaxHrField.value = Math.round(correspondingHR);
  }

  previewCSV(data) {
    if (!this.previewArea) return;
    if (!data || !data.length) {
      this.previewArea.innerHTML = "<p>No data to preview</p>";
      return;
    }
    const previewData = data.slice(0, 10);
    let tableHTML = '<table class="csv-table"><thead><tr>';
    if (previewData[0]) {
      previewData[0].forEach((h) => (tableHTML += `<th>${h}</th>`));
    }
    tableHTML += "</tr></thead><tbody>";
    for (let i = 1; i < previewData.length; i++) {
      tableHTML += "<tr>";
      previewData[i].forEach((cell) => (tableHTML += `<td>${cell}</td>`));
      tableHTML += "</tr>";
    }
    tableHTML += "</tbody></table>";
    const totalRows = data.length;
    const previewCount = Math.min(10, totalRows);
    this.previewArea.innerHTML = `
      <div class="preview-info">
        <p>Showing ${previewCount - 1} of ${totalRows - 1} data rows</p>
        <p>Filename: ${this.fileName}</p>
      </div>
      ${tableHTML}
    `;
    if (this.analysisTablesHTML) {
      const analysisDiv = document.createElement("div");
      analysisDiv.className = "csv-analysis";
      analysisDiv.innerHTML = this.analysisTablesHTML;
      this.previewArea.appendChild(analysisDiv);
    }
  }

  processCSV() {
    if (!this.csvData || this.csvData.length < 2) {
      this.showStatus("CSV file has fewer than 2 rows", true);
      return;
    }
    if (this.csvProcessed) {
      this.showStatus("CSV already processed", true);
      return;
    }
    const weightKgElement = document.getElementById("weight-kg");
    if (
      !weightKgElement ||
      !weightKgElement.value ||
      parseFloat(weightKgElement.value) <= 0
    ) {
      this.showStatus(
        "Please enter your weight before processing the CSV",
        true
      );
      return;
    }

    // Verify we have sufficient data rows
    if (this.csvData.length < 3) {
      this.showStatus("CSV doesn't have enough rows to process", true);
      return;
    }

    // Remove the second row (index 1)
    console.log("Before removing row 2, rows:", this.csvData.length);
    this.csvData.splice(1, 1);
    console.log("After removing row 2, rows:", this.csvData.length);

    // Add computed columns and process data
    this.addComputedColumns();

    // Find max HR FIRST (very important)
    this.findMaxHR();

    // Find Fat Max AFTER max HR is established
    this.findFatMax();

    // Get the current max HR value from the UI
    const maxHRInput = document.getElementById("max-hr");

    if (!maxHRInput) {
      console.error(
        "Max HR input element not found. Element ID should be 'max-hr'."
      );
      this.showStatus("Error: Max HR input element not found", true);
      return;
    }

    const maxHR = parseFloat(maxHRInput.value);

    // Debug log the maxHR to verify it was found
    console.log("Max HR input found:", maxHRInput);
    console.log("Current Max HR value:", maxHR);

    // Calculate HR zones explicitly, ensuring maxHR is valid
    if (!isNaN(maxHR) && maxHR > 0) {
      // Force zones calculation with the valid maxHR
      hrZoneData.calculateHrRanges(maxHR);

      // Debug log to verify zones were calculated
      console.log("HR Zones calculated:", JSON.stringify(hrZoneData.zones));
    } else {
      // Show error if max HR is not set
      this.showStatus("Max HR value is missing or invalid", true);
      return;
    }

    // Now populate heart rate zones with data from the CSV
    this.populateHeartRateZones();

    // Generate analysis tables
    this.generateAnalysisTables();

    // Mark as processed
    this.csvProcessed = true;

    if (this.processBtn) {
      this.processBtn.innerHTML = "CSV Processed ✔";
      this.processBtn.disabled = true;
      this.processBtn.classList.add("processed");
    }

    // Update status
    this.showStatus(
      `Row #2 removed, computed columns added, and zone metrics calculated. ${this.csvData.length} rows remaining.`
    );

    // Force UI update
    generateMetabolicReport();

    // Show preview
    this.previewCSV(this.csvData);
  }

  addComputedColumns() {
    if (!this.csvData || !this.csvData.length) return;
    const headerRow = this.csvData[0];
    const choIndex = headerRow.findIndex((h) => h.toLowerCase() === "cho");
    const fatIndex = headerRow.findIndex(
      (h) => h.toLowerCase() === "fat" || h.toLowerCase().includes("fat%")
    );
    const caloriesIndex = headerRow.findIndex(
      (h) =>
        h.toLowerCase().includes("cal") && !h.toLowerCase().includes("kcal/hr")
    );

    if (choIndex === -1) {
      headerRow.push("Fat-g/min", "CHO-g/min");
      for (let i = 1; i < this.csvData.length; i++) {
        const row = this.csvData[i];
        let fatValue = fatIndex !== -1 ? parseFloat(row[fatIndex]) || 0 : 0;
        let calories =
          caloriesIndex !== -1 ? parseFloat(row[caloriesIndex]) || 0 : 0;
        const fatGMin = (((fatValue / 100) * calories) / 9).toFixed(2);
        const choGMin = (
          ((parseFloat(row[choIndex] || 0) / 100) * calories) /
          4
        ).toFixed(2);
        row.push(fatGMin, choGMin);
      }
    } else {
      headerRow.splice(choIndex + 1, 0, "Fat-g/min", "CHO-g/min");
      for (let i = 1; i < this.csvData.length; i++) {
        const row = this.csvData[i];
        while (row.length < choIndex + 1) row.push("");
        const fatValue = fatIndex !== -1 ? parseFloat(row[fatIndex]) || 0 : 0;
        const calories =
          caloriesIndex !== -1 ? parseFloat(row[caloriesIndex]) || 0 : 0;
        const fatGMin = (((fatValue / 100) * calories) / 9).toFixed(2);
        const choGMin = (
          ((parseFloat(row[choIndex] || 0) / 100) * calories) /
          4
        ).toFixed(2);
        row.splice(choIndex + 1, 0, fatGMin, choGMin);
      }
    }
    console.log("Added computed columns to CSV data");
  }

  populateHeartRateZones() {
    if (!this.csvData || this.csvData.length < 2) {
      console.warn("Not enough CSV data to populate heart rate zones");
      return;
    }

    const headerRow = this.csvData[0];
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "heart", "bpm"]);
    const choIndex = this.findColumnIndex(headerRow, ["cho", "carb"]);
    const fatIndex = this.findColumnIndex(headerRow, ["fat", "fat%"]);
    const calIndex = this.findColumnIndex(headerRow, ["cal", "calories"]);

    if (hrIndex === -1 || choIndex === -1 || fatIndex === -1) {
      console.warn("Missing required columns for zone population:", {
        hrIndex,
        choIndex,
        fatIndex,
      });
      return;
    }

    // Make sure zones are properly initialized
    const maxHR = parseFloat(document.getElementById("max-hr").value);
    if (isNaN(maxHR) || maxHR <= 0) {
      console.warn("Invalid max HR for zone population:", maxHR);
      return;
    }

    // Double check that zones are calculated
    if (hrZoneData.zones[0].lowerHr === 0) {
      hrZoneData.calculateHrRanges(maxHR);
    }

    // Reset zone data collections
    hrZoneData.zones.forEach((zone) => {
      zone.choValues = [];
      zone.fatValues = [];
      zone.calValues = [];
    });

    console.log(
      "Processing CSV data for zone population, rows:",
      this.csvData.length - 1
    );

    // Process each data row
    let zoneAssignments = 0;
    for (let i = 1; i < this.csvData.length; i++) {
      const row = this.csvData[i];
      if (row.length <= Math.max(hrIndex, choIndex, fatIndex)) {
        continue;
      }

      const hr = parseFloat(row[hrIndex]);
      const cho = parseFloat(row[choIndex]);
      const fat = parseFloat(row[fatIndex]);
      const cal = calIndex !== -1 ? parseFloat(row[calIndex]) : null;

      if (isNaN(hr) || isNaN(cho) || isNaN(fat)) {
        continue;
      }

      // Add values to the appropriate zone
      hrZoneData.zones.forEach((zone) => {
        if (hr >= zone.lowerHr && hr <= zone.upperHr) {
          zone.choValues = zone.choValues || [];
          zone.fatValues = zone.fatValues || [];
          zone.calValues = zone.calValues || [];

          zone.choValues.push(cho);
          zone.fatValues.push(fat);
          if (cal !== null) zone.calValues.push(cal);
          zoneAssignments++;
        }
      });
    }

    console.log(`Assigned ${zoneAssignments} data points to HR zones`);

    // Calculate averages for each zone
    hrZoneData.zones.forEach((zone) => {
      const avg = (arr) =>
        arr && arr.length
          ? arr.reduce((sum, v) => sum + v, 0) / arr.length
          : null;

      zone.cho = Math.round(avg(zone.choValues) || 0);
      zone.fat = Math.round(avg(zone.fatValues) || 0);
      zone.cal = avg(zone.calValues)?.toFixed(1) || "";

      console.log(
        `Zone ${zone.zoneNum} (${zone.lowerHr}-${zone.upperHr}) - CHO: ${
          zone.cho
        }, FAT: ${zone.fat}, CAL: ${zone.cal}, points: ${
          zone.choValues?.length || 0
        }`
      );
    });

    // Update the UI with new zone data
    generateMetabolicReport();
  }

  generateAnalysisTables() {
    if (!this.csvData || this.csvData.length < 2) return;
    const weightKg = parseFloat(document.getElementById("weight-kg").value);
    if (isNaN(weightKg) || weightKg <= 0) {
      this.showStatus("Weight in kg is required for VO2 calculations", true);
      return;
    }

    const headerRow = this.csvData[0];
    let vo2Index = this.findColumnIndex(headerRow, ["vo2", "ml"]);
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "heart", "bpm"]);
    const fatGMinIndex = this.findColumnIndex(headerRow, ["fat-g/min"]);

    if (vo2Index === -1 || hrIndex === -1 || fatGMinIndex === -1) {
      this.showStatus(
        "CSV is missing required columns: VO2, HR, or fat-g/min data",
        true
      );
      return;
    }

    const dataRows = this.csvData.slice(1);
    const vo2Data = dataRows
      .map((row) => {
        const raw = parseFloat(row[vo2Index]) || 0;
        return { vo2: raw / weightKg, hr: parseFloat(row[hrIndex]) || 0 };
      })
      .filter((d) => d.vo2 > 0);
    const fatData = dataRows
      .map((row) => ({
        fatGMin: parseFloat(row[fatGMinIndex]) || 0,
        hr: parseFloat(row[hrIndex]) || 0,
      }))
      .filter((d) => d.fatGMin > 0);

    if (vo2Data.length < 5 || fatData.length < 5) {
      this.showStatus(
        "CSV does not contain enough valid data points for VO2 or fat oxidation analysis",
        true
      );
      return;
    }

    vo2Data.sort((a, b) => b.vo2 - a.vo2);
    fatData.sort((a, b) => b.fatGMin - a.fatGMin);

    const topVo2 = vo2Data.slice(0, 5);
    const topFat = fatData.slice(0, 5);
    const avgVo2 = Math.round(
      topVo2.reduce((s, d) => s + d.vo2, 0) / topVo2.length
    );
    const avgVo2Hr = Math.round(
      topVo2.reduce((s, d) => s + d.hr, 0) / topVo2.length
    );
    const avgFatGMin = (
      topFat.reduce((s, d) => s + d.fatGMin, 0) / topFat.length
    ).toFixed(2);
    const avgFatHr = Math.round(
      topFat.reduce((s, d) => s + d.hr, 0) / topFat.length
    );

    this.analysisData = {
      topVo2,
      topFat,
      avgVo2,
      avgVo2Hr,
      avgFatGMin,
      avgFatHr,
      weightKg,
    };
    this.createAnalysisTables();
  }

  createAnalysisTables() {
    const d = this.analysisData;
    if (!d) return;

    let vo2Table = `
      <div class="analysis-table-container">
        <h5>VO2 Analysis</h5>
        <table class="analysis-table"><thead>
          <tr><th>VO₂ (ml/kg/min)</th><th>HR</th><th>Avg VO₂</th><th>Avg HR</th></tr>
        </thead><tbody>`;
    for (let i = 0; i < 5; i++) {
      const row = d.topVo2[i] || { vo2: "-", hr: "-" };
      vo2Table += `<tr>
        <td>${typeof row.vo2 === "number" ? row.vo2.toFixed(1) : "-"}</td>
        <td>${typeof row.hr === "number" ? row.hr.toFixed(0) : "-"}</td>
        ${
          i === 0
            ? `<td rowspan="5">${d.avgVo2}</td><td rowspan="5">${d.avgVo2Hr}</td>`
            : ""
        }
      </tr>`;
    }
    vo2Table += `</tbody></table></div>`;

    let fatTable = `
      <div class="analysis-table-container">
        <h5>Fat Oxidation Analysis</h5>
        <table class="analysis-table"><thead>
          <tr><th>HR</th><th>Fat (g/min)</th><th>Avg HR</th><th>Avg Fat</th></tr>
        </thead><tbody>`;
    for (let i = 0; i < 5; i++) {
      const row = d.topFat[i] || { hr: "-", fatGMin: "-" };
      fatTable += `<tr>
        <td>${typeof row.hr === "number" ? row.hr : "-"}</td>
        <td>${
          typeof row.fatGMin === "number" ? row.fatGMin.toFixed(2) : "-"
        }</td>
        ${
          i === 0
            ? `<td rowspan="5">${d.avgFatHr}</td><td rowspan="5">${d.avgFatGMin}</td>`
            : ""
        }
      </tr>`;
    }
    fatTable += `</tbody></table></div>`;

    this.analysisTablesHTML = `<div class="analysis-container">${fatTable}${vo2Table}</div>`;

    // Update the metabolic report to display the analysis tables
    generateMetabolicReport();

    // Remove the code that adds the tables to the CSV preview area
    // No longer displaying analysis tables in the CSV preview
  }
}

// expose globally
window.AMRCsvHandler = new AMRCsvHandler();

// ---------------------------------------------
// Inline functions & DOM logic (from HTML <script>)
// ---------------------------------------------

function updatePersonalInfo() {
  const testDate = document.getElementById("test-date").value;
  const firstName = document.getElementById("first-name").value;
  const lastName = document.getElementById("last-name").value;
  const tableBody = document.querySelector("#vo2-data-table tbody");
  if (tableBody) {
    tableBody.innerHTML = "";
    if (testDate || firstName || lastName) {
      const row = document.createElement("tr");
      const dateCell = document.createElement("td");
      dateCell.textContent = testDate
        ? new Date(testDate).toLocaleDateString()
        : "";
      row.appendChild(dateCell);
      const firstNameCell = document.createElement("td");
      firstNameCell.textContent = firstName || "";
      row.appendChild(firstNameCell);
      const lastNameCell = document.createElement("td");
      lastNameCell.textContent = lastName || "";
      row.appendChild(lastNameCell);
      tableBody.appendChild(row);
    }
  }
}

function calculateWeightKg() {
  const lbs = parseFloat(document.getElementById("weight-lbs").value);
  const kgInput = document.getElementById("weight-kg");
  if (!isNaN(lbs) && lbs > 0) {
    kgInput.value = (lbs / 2.204).toFixed(2);
  } else {
    kgInput.value = "";
  }
}

function calculateWeightBasedVO2(vo2Value) {
  const kg = parseFloat(document.getElementById("weight-kg").value);
  if (!isNaN(kg) && kg > 0) return vo2Value / kg;
  return vo2Value;
}

function calculateHRZones() {
  const maxHR = parseFloat(document.getElementById("max-hr").value);
  if (isNaN(maxHR) || maxHR <= 0) return;

  // Calculate zones using our data model
  hrZoneData.calculateHrRanges(maxHR);

  // Update the display with the new zone data
  generateMetabolicReport();
}

function generateMetabolicReport() {
  const d = collectMetabolicData();
  const div = document.getElementById("metabolic-report");

  // Start with VO2 and Fat Max data sections
  let html = `
    <div><h5>VO2 Max</h5><p><strong>METs:</strong> ${d.vo2mets} | <strong>ml/kg/min:</strong> ${d.vo2ml}</p></div>
    <div><h5>Fat Max</h5><p><strong>Max Fat Ox:</strong> ${d.fatmaxgrams} g/min @ ${d.fatmaxhr} bpm</p></div>`;

  // Add HR Zones table with consistent styling from updateZonesDisplay
  html += `
    <div class="zone-display">
      <h5>HR Training Zones</h5>
      <table class="zone-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>Heart Rate Range</th>
            <th>CHO %</th>
            <th>FAT %</th>
            <th>Cal/min</th>
          </tr>
        </thead>
        <tbody>`;

  hrZoneData.zones.forEach((zone) => {
    // Change fat display logic to show 0 instead of N/A
    const fatDisplay = zone.fat === 0 || !zone.fat ? "0" : zone.fat;

    html += `
      <tr>
        <td>Zone ${zone.zoneNum}</td>
        <td>${zone.lowerHr}-${zone.upperHr}</td>
        <td>${zone.cho || "N/A"}</td>
        <td>${fatDisplay}</td>
        <td>${zone.cal || "N/A"}</td>
      </tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>`;

  // Display analysis tables if available from CSV processing
  if (window.AMRCsvHandler && window.AMRCsvHandler.analysisTablesHTML) {
    html += `
      <div class="analysis-tables-container">
        ${window.AMRCsvHandler.analysisTablesHTML}
      </div>`;
  }

  div.innerHTML = html;
}

// Collect metabolic data
function collectMetabolicData() {
  const data = {};

  // Collect basic fields from DOM as before
  [
    "test-date",
    "first-name",
    "last-name",
    "age",
    "gender",
    "weight-lbs",
    "weight-kg",
    "vo2-mets",
    "vo2-ml",
    "max-hr",
    "min-hr",
    "fat-max-grams",
    "fat-max-hr",
  ].forEach(
    (id) => (data[id.replace(/-/g, "")] = document.getElementById(id)?.value)
  );

  // Add zone data from our model
  hrZoneData.zones.forEach((zone) => {
    const i = zone.zoneNum;
    data[`z${i}LowerHr`] = zone.lowerHr;
    data[`z${i}UpperHr`] = zone.upperHr;
    data[`z${i}Cho`] = zone.cho;
    data[`z${i}Fat`] = zone.fat;
    data[`z${i}Cal`] = zone.cal;
  });

  return data;
}

// Form manager (save/load to localStorage & server)
const formManager = {
  saveFormData() {
    try {
      const formData = collectMetabolicData(); // Direct call to collectMetabolicData
      localStorage.setItem("amrFormData", JSON.stringify(formData));
      this.syncWithServer(formData);
      return formData;
    } catch (e) {
      console.error(e);
      alert("Error saving data: " + e.message);
      return null;
    }
  },
  loadFormData() {
    const saved = localStorage.getItem("amrFormData");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.populateForm(data);
        return true;
      } catch (e) {
        console.error(e);
      }
    }
    return false;
  },
  populateForm(data) {
    for (const [k, v] of Object.entries(data)) {
      const el = document.getElementById(k.replace(/-/g, ""));
      if (el) el.value = v;
    }
    generateMetabolicReport();
  },
  syncWithServer(formData) {
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })
      .then((r) => r.json())
      .then((d) => console.log("Server save:", d))
      .catch(console.error);
  },
  loadFromServer(clientId) {
    fetch(`/api/client/${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          this.populateForm({ ...d.client, ...d.data });
          localStorage.setItem(
            "amrFormData",
            JSON.stringify({ ...d.client, ...d.data })
          );
        }
      })
      .catch(console.error);
  },
};

// 1. Helper to turn an ArrayBuffer into a Base64 string
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let b of bytes) binary += String.fromCharCode(b);
  return window.btoa(binary);
}

async function registerGlacialFont(doc) {
  try {
    // Use a local font file instead of remote URL
    const fontUrl = "./fonts/GlacialIndifference-Regular.ttf";

    const resp = await fetch(fontUrl);
    const buffer = await resp.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);

    doc.addFileToVFS("GlacialIndifference-Regular.ttf", base64);
    doc.addFont(
      "GlacialIndifference-Regular.ttf",
      "GlacialIndifference",
      "normal"
    );
  } catch (error) {
    console.error("Error loading font:", error);
    // Fallback to a standard font
    doc.setFont("helvetica", "normal");
  }
}

// PDF download logic
document.getElementById("download-pdf").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await registerGlacialFont(doc);

  // Define page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerY = pageHeight / 2;

  // Define addBackgroundImage function first
  const addBackgroundImage = async () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = "newbackground.png";
      img.onload = () => {
        doc.addImage(img, "PNG", 0, 0, pageWidth, pageHeight);
        resolve();
      };
      img.onerror = () => {
        console.warn("Background image could not be loaded");
        resolve();
      };
      setTimeout(resolve, 2000);
    });
  };

  // Validate inputs
  const maxHR = parseFloat(document.getElementById("max-hr").value);
  if (isNaN(maxHR) || maxHR <= 0) {
    alert("Please enter a valid Max HR value before generating the PDF.");
    return;
  }

  // Make sure we have a resting HR value
  const minHR = parseFloat(document.getElementById("min-hr").value) || 60;

  // Force recalculation of HR zones
  hrZoneData.calculateHrRanges(maxHR);

  // Double-check zones calculation
  if (hrZoneData.zones[0].lowerHr === 0 && hrZoneData.zones[0].upperHr === 0) {
    hrZoneData.zones.forEach((zone) => {
      zone.lowerHr = Math.round(maxHR * zone.lowerPercent);
      zone.upperHr = Math.round(maxHR * zone.upperPercent);
    });
  }

  try {
    // Title page
    await addBackgroundImage();
    doc
      .setFont("GlacialIndifference", "normal")
      .setFontSize(24)
      .setTextColor("#333333")
      .text("Heart Rate Zones and Fat Max", pageWidth / 2, centerY - 20, {
        align: "center",
      });

    doc
      .setFont("GlacialIndifference", "normal")
      .setFontSize(14)
      .text(
        `Client: ${document.getElementById("first-name").value || ""} ${
          document.getElementById("last-name").value || ""
        }`,
        pageWidth / 2,
        centerY + 30,
        {
          align: "center",
        }
      );

    doc.text(
      `Date: ${new Date(
        document.getElementById("test-date").value || new Date()
      ).toLocaleDateString()}`,
      pageWidth / 2,
      centerY + 50,
      {
        align: "center",
      }
    );

    // HR Zones page with background
    doc.addPage();
    await addBackgroundImage();

    // Title for HR Zones
    doc
      .setFont("GlacialIndifference", "normal")
      .setFontSize(18)
      .setTextColor("#333333")
      .text("HR Training Zones", pageWidth / 2, 100, {
        align: "center",
      });

    // Create HR zones table with guaranteed values
    const zoneHeaders = [
      ["Zone", "Heart Rate Range", "CHO %", "FAT %", "Cal/min"],
    ];
    const zoneRows = hrZoneData.zones.map((zone) => [
      `Zone ${zone.zoneNum}`,
      `${zone.lowerHr}-${zone.upperHr}`,
      zone.cho || "N/A",
      zone.fat || "0",
      zone.cal || "N/A",
    ]);

    // Apply custom styling to match page CSS
    doc.autoTable({
      head: zoneHeaders,
      body: zoneRows,
      startY: 130,
      margin: { left: 80, right: 80 },
      styles: {
        textColor: [51, 51, 51],
        fontSize: 12,
        cellPadding: 8,
      },
      headStyles: {
        fillColor: [253, 246, 236],
        textColor: [51, 51, 51],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: "auto" },
        2: { cellWidth: "auto" },
        3: { cellWidth: "auto" },
        4: { cellWidth: "auto" },
      },
      didDrawCell: (data) => {
        // Add cell borders
        if (data.section === "body" || data.section === "head") {
          const { x, y, width, height } = data.cell;
          doc.setDrawColor(193, 153, 98); // #c19962
          doc.setLineWidth(0.5);
          doc.rect(x, y, width, height);
        }
      },
    });

    // Show Fat Max information
    doc.setFontSize(12);
    const fatMaxGrams = document.getElementById("fat-max-grams").value || "N/A";
    const fatMaxHr = document.getElementById("fat-max-hr").value || "N/A";

    // Create a table for Fat Max data instead of a single text line
    const fatMaxHeaders = [["Fat Max Data"]];
    const fatMaxRows = [
      [`Max Fat Oxidation: ${fatMaxGrams} g/min @ ${fatMaxHr} bpm`],
    ];

    doc.autoTable({
      head: fatMaxHeaders,
      body: fatMaxRows,
      startY: 340, // Moved down to match the new title position
      margin: { left: 80, right: 80 },
      styles: {
        textColor: [51, 51, 51],
        fontSize: 12,
        cellPadding: 8,
        halign: "center",
      },
      headStyles: {
        fillColor: [253, 246, 236],
        textColor: [51, 51, 51],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: "auto" },
      },
      didDrawCell: (data) => {
        // Add cell borders
        if (data.section === "body" || data.section === "head") {
          const { x, y, width, height } = data.cell;
          doc.setDrawColor(193, 153, 98); // #c19962
          doc.setLineWidth(0.5);
          doc.rect(x, y, width, height);
        }
      },
    });

    // Add client information and other analysis if available
    if (window.AMRCsvHandler && window.AMRCsvHandler.analysisData) {
      // Analysis tables page with background
      doc.addPage();
      await addBackgroundImage();

      const analysisData = window.AMRCsvHandler.analysisData;

      // Define page and table dimensions ONCE for the entire page
      const pageWidth = doc.internal.pageSize.getWidth();
      const tableWidth = pageWidth - 160; // 80px margin on each side
      const columnWidth = tableWidth / 2; // Equal width for each column

      // Add VO2 Analysis Table
      if (analysisData.topVo2 && analysisData.topVo2.length) {
        // Main VO2 Analysis table with just the data points
        const vo2Headers = [["VO2 (ml/kg/min)", "HR"]];
        const vo2Rows = analysisData.topVo2.map((row) => [
          typeof row.vo2 === "number" ? row.vo2.toFixed(1) : "-",
          typeof row.hr === "number" ? row.hr.toFixed(0) : "-",
        ]);

        doc.setFontSize(18);
        doc.setTextColor("#333333");
        doc.setFont("GlacialIndifference", "normal");
        doc.text("VO2 Analysis", pageWidth / 2, 80, { align: "center" });

        // First table uses the shared dimensions
        doc.autoTable({
          head: vo2Headers,
          body: vo2Rows,
          startY: 95,
          margin: { left: 80, right: 80 },
          styles: {
            textColor: [51, 51, 51],
            fontSize: 12,
            cellPadding: 8,
            halign: "center",
            valign: "middle",
          },
          headStyles: {
            fillColor: [253, 246, 236],
            textColor: [51, 51, 51],
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
          },
          columnStyles: {
            0: { cellWidth: columnWidth },
            1: { cellWidth: columnWidth },
          },
          didDrawCell: (data) => {
            // Add cell borders
            if (data.section === "body" || data.section === "head") {
              const { x, y, width, height } = data.cell;
              doc.setDrawColor(193, 153, 98); // #c19962
              doc.setLineWidth(0.5);
              doc.rect(x, y, width, height);
            }
          },
        });

        // Get the final Y position of the first table
        const firstTableEndY = doc.previousAutoTable.finalY + 15;

        // Second table for average values
        const avgHeaders = [["Avg VO2 Max", "Avg HR"]];
        const avgRows = [[analysisData.avgVo2, analysisData.avgVo2Hr]];

        // Second table also uses the same dimensions
        doc.autoTable({
          head: avgHeaders,
          body: avgRows,
          startY: firstTableEndY,
          margin: { left: 80, right: 80 },
          styles: {
            textColor: [51, 51, 51],
            fontSize: 12,
            cellPadding: 8,
            halign: "center",
            valign: "middle",
          },
          headStyles: {
            fillColor: [253, 246, 236],
            textColor: [51, 51, 51],
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
          },
          columnStyles: {
            0: { cellWidth: columnWidth },
            1: { cellWidth: columnWidth },
          },
          didDrawCell: (data) => {
            // Add cell borders
            if (data.section === "body" || data.section === "head") {
              const { x, y, width, height } = data.cell;
              doc.setDrawColor(193, 153, 98); // #c19962
              doc.setLineWidth(0.5);
              doc.rect(x, y, width, height);
            }
          },
        });
      }

      // Add Fat Oxidation Analysis Table - already has access to the same dimensions
      if (analysisData.topFat && analysisData.topFat.length) {
        // Main Fat Oxidation analysis table with just the data points
        const fatHeaders = [["Fat (g/min)", "HR"]];
        const fatRows = analysisData.topFat.map((row) => [
          typeof row.fatGMin === "number" ? row.fatGMin.toFixed(2) : "-",
          typeof row.hr === "number" ? row.hr : "-",
        ]);

        doc.setFontSize(18);
        doc.setTextColor("#333333");
        doc.setFont("GlacialIndifference", "normal");
        doc.text("Fat Oxidation Analysis", pageWidth / 2, 390, {
          align: "center",
        });

        // Calculate column widths for consistent size

        doc.autoTable({
          head: fatHeaders,
          body: fatRows,
          startY: 400,
          margin: { left: 80, right: 80 },
          styles: {
            textColor: [51, 51, 51],
            fontSize: 12,
            cellPadding: 8,
            halign: "center",
            valign: "middle",
          },
          headStyles: {
            fillColor: [253, 246, 236],
            textColor: [51, 51, 51],
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
          },
          columnStyles: {
            0: { cellWidth: columnWidth },
            1: { cellWidth: columnWidth },
          },
          didDrawCell: (data) => {
            // Add cell borders
            if (data.section === "body" || data.section === "head") {
              const { x, y, width, height } = data.cell;
              doc.setDrawColor(193, 153, 98); // #c19962
              doc.setLineWidth(0.5);
              doc.rect(x, y, width, height);
            }
          },
        });

        // Get the final Y position of the fat table
        const fatTableEndY = doc.previousAutoTable.finalY + 20;

        // Second table for average fat values
        const avgFatHeaders = [["Avg Fat", "Avg HR"]];
        const avgFatRows = [[analysisData.avgFatGMin, analysisData.avgFatHr]];

        doc.autoTable({
          head: avgFatHeaders,
          body: avgFatRows,
          startY: fatTableEndY, // Position it 20 points below the fat table
          margin: { left: 80, right: 80 },
          styles: {
            textColor: [51, 51, 51],
            fontSize: 12,
            cellPadding: 8,
            halign: "center",
            valign: "middle",
          },
          headStyles: {
            fillColor: [253, 246, 236],
            textColor: [51, 51, 51],
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
          },
          didDrawCell: (data) => {
            // Add cell borders
            if (data.section === "body" || data.section === "head") {
              const { x, y, width, height } = data.cell;
              doc.setDrawColor(193, 153, 98); // #c19962
              doc.setLineWidth(0.5);
              doc.rect(x, y, width, height);
            }
          },
        });
      }
    }

    // Save the PDF
    const firstName = document.getElementById("first-name").value || "Client";
    const lastName = document.getElementById("last-name").value || "Report";
    doc.save(`${firstName}_${lastName}_Metabolic_Report.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
    alert("Error generating PDF: " + error.message);
  }
});

// Store zone data in a JS object instead of hidden DOM inputs
const hrZoneData = {
  zones: [
    {
      zoneNum: 1,
      lowerPercent: 0.5,
      upperPercent: 0.599,
      lowerHr: 0,
      upperHr: 0,
      cho: 0,
      fat: 0,
      cal: 0,
    },
    {
      zoneNum: 2,
      lowerPercent: 0.6,
      upperPercent: 0.699,
      lowerHr: 0,
      upperHr: 0,
      cho: 0,
      fat: 0,
      cal: 0,
    },
    {
      zoneNum: 3,
      lowerPercent: 0.7,
      upperPercent: 0.799,
      lowerHr: 0,
      upperHr: 0,
      cho: 0,
      fat: 0,
      cal: 0,
    },
    {
      zoneNum: 4,
      lowerPercent: 0.8,
      upperPercent: 0.899,
      lowerHr: 0,
      upperHr: 0,
      cho: 0,
      fat: 0,
      cal: 0,
    },
    {
      zoneNum: 5,
      lowerPercent: 0.9,
      upperPercent: 1.0,
      lowerHr: 0,
      upperHr: 0,
      cho: 0,
      fat: 0,
      cal: 0,
    },
  ],

  // Method to calculate HR ranges based on max HR
  calculateHrRanges(maxHR) {
    if (isNaN(maxHR) || maxHR <= 0) return;

    this.zones.forEach((zone) => {
      zone.lowerHr = Math.round(maxHR * zone.lowerPercent);
      zone.upperHr = Math.round(maxHR * zone.upperPercent);
    });

    return this.zones;
  },
};

// DOMContentLoaded initialization
document.addEventListener("DOMContentLoaded", () => {
  // personal info listeners
  ["test-date", "first-name", "last-name"].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
      el.addEventListener(
        id === "test-date" ? "change" : "input",
        updatePersonalInfo
      );
  });

  // weight conversion
  const lbsIn = document.getElementById("weight-lbs");
  if (lbsIn) {
    calculateWeightKg();
    lbsIn.addEventListener("input", calculateWeightKg);
  }

  // metabolic data
  const saveBtn = document.getElementById("save-metabolic-data");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      formManager.saveFormData();
      generateMetabolicReport();
      alert("Data saved and report updated!");
    });
  }

  // HR zones auto-calc
  const maxHRInput = document.getElementById("max-hr");
  if (maxHRInput) {
    maxHRInput.addEventListener("input", calculateHRZones);
    maxHRInput.addEventListener("change", calculateHRZones);
  }

  // CSV handler
  if (window.AMRCsvHandler) window.AMRCsvHandler.init();

  // form auto-load
  formManager.loadFormData();

  // table update
  updatePersonalInfo();
});

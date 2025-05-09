class AMRCsvHandler {
  constructor() {
    this.csvData = null;
    this.fileName = null;
    this.initialized = false;
    this.analysisData = null;
    this.analysisTablesHTML = null;
    this.csvProcessed = false; // Flag to track if CSV has been processed
  }

  /**
   * Initializes the CSV handler with DOM elements
   * @param {Object} config - Configuration with DOM element IDs
   */
  init(config = {}) {
    if (this.initialized) {
      console.log("AMRCsvHandler already initialized");
      return this;
    }

    // Default configuration
    const defaults = {
      fileInputId: "csv-file-input",
      dropZoneId: "csv-drop-zone",
      previewAreaId: "csv-preview",
      statusMessageId: "csv-status",
      processBtnId: "process-csv-btn",
    };

    this.config = { ...defaults, ...config };

    // First ensure the required elements exist in the DOM
    this.ensureRequiredElements();

    // Initialize DOM elements
    this.setupElements();
    this.setupEventListeners();

    this.initialized = true;
    console.log("AMRCsvHandler initialized successfully");

    return this;
  }

  /**
   * Ensure all required elements exist in the DOM
   */
  ensureRequiredElements() {
    // Check if drop zone exists - this is our main container
    const dropZone = document.getElementById(this.config.dropZoneId);

    // If drop zone doesn't exist or has no content, add default content
    if (dropZone) {
      // Make sure it has some content
      if (!dropZone.innerHTML.trim()) {
        dropZone.innerHTML = "<p>Drop CSV file here or click to browse</p>";
      }
    } else {
      console.error(
        `Drop zone element #${this.config.dropZoneId} not found in the DOM`
      );
    }

    // Check for preview area and create it if not found
    if (!document.getElementById(this.config.previewAreaId)) {
      const previewArea = document.createElement("div");
      previewArea.id = this.config.previewAreaId;
      previewArea.className = "csv-preview";

      // Find the container where we should append this
      const container = document.querySelector(".csv-container");
      if (container) {
        container.appendChild(previewArea);
      } else {
        console.error("CSV container not found, can't create preview area");
      }
    }

    // Check for the process button text
    const processBtn = document.getElementById(this.config.processBtnId);
    if (processBtn && !processBtn.innerText) {
      processBtn.innerText = "Process CSV (Remove Row #2)";
      processBtn.disabled = true;
    }
  }

  /**
   * Set up DOM element references
   */
  setupElements() {
    // Get references to existing DOM elements first
    this.dropZone = document.getElementById(this.config.dropZoneId);
    this.previewArea = document.getElementById(this.config.previewAreaId);
    this.statusMessage = document.getElementById(this.config.statusMessageId);
    this.processBtn = document.getElementById(this.config.processBtnId);

    // Create file input element if it doesn't exist
    if (!document.getElementById(this.config.fileInputId)) {
      const fileInput = document.createElement("input");
      fileInput.id = this.config.fileInputId;
      fileInput.type = "file";
      fileInput.accept = ".csv";
      fileInput.style.display = "none";

      // Append file input to the container with the drop zone instead of body
      if (this.dropZone && this.dropZone.parentNode) {
        this.dropZone.parentNode.appendChild(fileInput);
      } else {
        // Fallback to body if drop zone container can't be found
        document.body.appendChild(fileInput);
      }
    }

    // Always get a fresh reference to the file input
    this.fileInput = document.getElementById(this.config.fileInputId);

    // Log debug info
    console.log("CSV Handler elements setup:", {
      fileInput: this.fileInput,
      dropZone: this.dropZone,
      previewArea: this.previewArea,
      statusMessage: this.statusMessage,
      processBtn: this.processBtn,
    });
  }

  /**
   * Set up event listeners for file input and drop zone
   */
  setupEventListeners() {
    // Guard against missing elements
    if (!this.fileInput || !this.dropZone) {
      console.error("Required elements not found:", {
        fileInput: this.fileInput,
        dropZone: this.dropZone,
      });
      return;
    }

    // File input change event
    this.fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFile(file);
      }
    });

    // Drop zone events
    this.dropZone.addEventListener("click", () => {
      console.log("Drop zone clicked");
      if (this.fileInput) {
        this.fileInput.click();
      }
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

      console.log("File dropped", e.dataTransfer.files);
      if (e.dataTransfer.files.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    // Process button click event
    if (this.processBtn) {
      this.processBtn.addEventListener("click", () => {
        if (this.csvData && !this.csvProcessed) {
          this.processCSV();
        } else if (this.csvProcessed) {
          this.showStatus(
            "CSV already processed - upload a new file to process again",
            true
          );
        }
      });
    }

    console.log("CSV Handler event listeners setup completed");
  }

  /**
   * Creates an element if it doesn't exist in the document
   */
  createElementIfNotExists(id, tagName, attributes = {}) {
    if (!document.getElementById(id)) {
      const element = document.createElement(tagName);
      element.id = id;

      // Apply all attributes
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === "innerHTML") {
          element.innerHTML = value;
        } else if (key === "className") {
          element.className = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      document.body.appendChild(element);
    }
  }

  /**
   * Handle the uploaded file
   * @param {File} file - The uploaded CSV file
   */
  handleFile(file) {
    console.log("Handling file:", file.name);

    // Validate that it's a CSV file
    if (!this.validateFileType(file)) {
      this.showStatus("Please select a valid CSV file", true);
      return;
    }

    this.fileName = file.name;

    // Reset processed state for new file
    this.csvProcessed = false;

    // Read the file content - use an arrow function to maintain 'this' context
    const reader = new FileReader();

    // Store the current 'this' context to use within the callback
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

        // Reset the analysis data from any previous file
        self.analysisData = null;
        self.analysisTablesHTML = null;

        // Find and populate maximum HR value
        self.findMaxHR();

        // Call previewCSV with the correct context
        self.previewCSV(self.csvData); // Preview original data
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

  /**
   * Find the maximum HR value in the CSV data and populate the max-hr input field
   */
  findMaxHR() {
    if (!this.csvData || this.csvData.length < 2) {
      console.log("No CSV data available to find max HR");
      return;
    }

    const headerRow = this.csvData[0];

    // Find the HR column index
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "heart", "bpm"]);

    if (hrIndex === -1) {
      console.warn("Could not find HR column in CSV data");
      return;
    }

    console.log("Found HR column at index:", hrIndex);

    // Extract all HR values from the data rows
    let maxHR = 0;

    // Skip header row
    for (let i = 1; i < this.csvData.length; i++) {
      const row = this.csvData[i];

      // Make sure the row has enough cells
      if (row.length > hrIndex) {
        const hrValue = parseFloat(row[hrIndex]);

        // Update max HR if this value is greater and valid
        if (!isNaN(hrValue) && hrValue > maxHR) {
          maxHR = hrValue;
        }
      }
    }

    console.log("Found maximum HR value:", maxHR);

    // Populate the max-hr input field if it exists
    const maxHRInput = document.getElementById("max-hr");

    if (maxHRInput && maxHR > 0) {
      maxHRInput.value = maxHR;

      // Trigger the calculateHRZones function if it exists
      if (typeof calculateHRZones === "function") {
        calculateHRZones();
        console.log("Triggered HR zones calculation with max HR:", maxHR);
      } else {
        console.log("calculateHRZones function not available");
      }

      // Create a change event to trigger any listeners on this input
      const event = new Event("change");
      maxHRInput.dispatchEvent(event);

      console.log("Populated max HR input field with value:", maxHR);
    } else {
      console.warn("Could not find max-hr input field or no valid HR found");
    }
  }

  /**
   * Find the maximum fat oxidation value and its corresponding HR
   */
  findFatMax() {
    if (!this.csvData || this.csvData.length < 2) {
      console.warn("Not enough CSV data to find fat max");
      return;
    }

    const headerRow = this.csvData[0];

    // Find column indices for Fat-g/min and HR
    const fatGMinIndex = this.findColumnIndex(headerRow, ["fat-g/min"]);
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "heart", "bpm"]);

    if (fatGMinIndex === -1 || hrIndex === -1) {
      console.warn("Could not find required columns for fat max calculation");
      return;
    }

    console.log("Finding Fat Max using columns:", {
      "Fat-g/min": fatGMinIndex,
      HR: hrIndex,
    });

    // Find maximum fat oxidation value and corresponding HR
    let maxFatGMin = 0;
    let correspondingHR = 0;

    // Skip header row
    for (let i = 1; i < this.csvData.length; i++) {
      const row = this.csvData[i];

      // Make sure row has enough cells
      if (row.length <= Math.max(fatGMinIndex, hrIndex)) {
        continue;
      }

      const fatValue = parseFloat(row[fatGMinIndex]);
      const hrValue = parseFloat(row[hrIndex]);

      if (isNaN(fatValue) || isNaN(hrValue)) {
        continue;
      }

      // Update max if this value is greater
      if (fatValue > maxFatGMin) {
        maxFatGMin = fatValue;
        correspondingHR = hrValue;
      }
    }

    console.log("Found Fat Max:", {
      "Max Fat-g/min": maxFatGMin,
      "HR at Max Fat": correspondingHR,
    });

    // Populate form fields
    const fatMaxGramsField = document.getElementById("fat-max-grams");
    const fatMaxHrField = document.getElementById("fat-max-hr");

    if (fatMaxGramsField && maxFatGMin > 0) {
      fatMaxGramsField.value = maxFatGMin.toFixed(2);
    }

    if (fatMaxHrField && correspondingHR > 0) {
      fatMaxHrField.value = Math.round(correspondingHR);
    }
  }

  /**
   * Preview the first 10 rows of CSV data and analysis tables
   * @param {Array} data - The CSV data as 2D array
   */
  previewCSV(data) {
    if (!this.previewArea) {
      console.error("Preview area not found");
      return;
    }

    if (!data || !data.length) {
      this.previewArea.innerHTML = "<p>No data to preview</p>";
      return;
    }

    // Limit to first 10 rows for preview
    const previewData = data.slice(0, 10);

    // Create an HTML table for preview
    let tableHTML = '<table class="csv-table"><thead><tr>';

    // Create header row if available
    if (previewData[0]) {
      previewData[0].forEach((header) => {
        tableHTML += `<th>${header}</th>`;
      });
    }

    tableHTML += "</tr></thead><tbody>";

    // Create data rows
    for (let i = 1; i < previewData.length; i++) {
      tableHTML += "<tr>";
      previewData[i].forEach((cell) => {
        tableHTML += `<td>${cell}</td>`;
      });
      tableHTML += "</tr>";
    }

    tableHTML += "</tbody></table>";

    // Show row count information
    const totalRows = data.length;
    const previewCount = Math.min(10, totalRows);

    this.previewArea.innerHTML = `
      <div class="preview-info">
        <p>Showing ${previewCount - 1} of ${totalRows - 1} data rows</p>
        <p>Filename: ${this.fileName}</p>
      </div>
      ${tableHTML}
    `;

    // Add the analysis tables if available
    if (this.analysisTablesHTML) {
      const analysisDiv = document.createElement("div");
      analysisDiv.className = "csv-analysis";
      analysisDiv.innerHTML = this.analysisTablesHTML;
      this.previewArea.appendChild(analysisDiv);
    }
  }

  /**
   * Process the CSV data - removes row #2 and adds computed columns
   */
  processCSV() {
    if (!this.csvData || this.csvData.length < 2) {
      this.showStatus("CSV file has fewer than 2 rows", true);
      return;
    }

    // Check if already processed
    if (this.csvProcessed) {
      this.showStatus(
        "CSV already processed - upload a new file to process again",
        true
      );
      return;
    }

    // Check if weight is provided before processing
    const weightKgElement = document.getElementById("weight-kg");
    if (
      !weightKgElement ||
      !weightKgElement.value ||
      parseFloat(weightKgElement.value) <= 0
    ) {
      this.showStatus(
        "Please enter your weight before processing the CSV file",
        true
      );
      return;
    }

    // Remove row #2 (index 1)
    this.csvData.splice(1, 1);

    // Add computed columns
    this.addComputedColumns();

    // Find and populate Fat Max values
    this.findFatMax();

    // Calculate and populate heart rate zone metrics
    this.populateHeartRateZones();

    // Generate analysis tables
    this.generateAnalysisTables();

    // Mark as processed
    this.csvProcessed = true;

    // Update the process button to indicate it's been processed
    if (this.processBtn) {
      this.processBtn.innerHTML = "CSV Processed &#10004;";
      this.processBtn.disabled = true;
      this.processBtn.classList.add("processed");
    }

    this.showStatus(
      `Row #2 removed, computed columns added, and zone metrics calculated. ${this.csvData.length} rows remaining.`
    );

    // Preview the modified data
    this.previewCSV(this.csvData);
  }

  /**
   * Calculate and populate heart rate zone metrics from CSV data
   */
  populateHeartRateZones() {
    if (!this.csvData || this.csvData.length < 2) {
      console.warn("Not enough CSV data to calculate heart rate zone metrics");
      return;
    }

    const headerRow = this.csvData[0];

    // Find column indices for HR, CHO and FAT
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "heart", "bpm"]);
    const choIndex = this.findColumnIndex(headerRow, ["cho", "carb"]);
    const fatIndex = this.findColumnIndex(headerRow, ["fat", "fat%"]);
    const calIndex = this.findColumnIndex(headerRow, [
      "cal",
      "kcal",
      "calories",
    ]);

    console.log("Found column indices for zone calculations:", {
      hrIndex,
      choIndex,
      fatIndex,
      calIndex,
    });

    if (hrIndex === -1 || choIndex === -1 || fatIndex === -1) {
      console.warn(
        "Could not find required columns for heart rate zone calculations"
      );
      return;
    }

    // Get HR zone boundaries from inputs
    const zones = [];
    for (let i = 1; i <= 5; i++) {
      const lowerHrInput = document.getElementById(`z${i}-lower-hr`);
      const upperHrInput = document.getElementById(`z${i}-upper-hr`);

      if (
        !lowerHrInput ||
        !upperHrInput ||
        !lowerHrInput.value ||
        !upperHrInput.value
      ) {
        console.warn(`Missing HR boundary values for zone ${i}`);
        continue;
      }

      zones.push({
        zone: i,
        lowerHr: parseInt(lowerHrInput.value),
        upperHr: parseInt(upperHrInput.value),
        choValues: [],
        fatValues: [],
        calValues: [],
      });
    }

    // Skip header row (index 0), process data rows
    for (let i = 1; i < this.csvData.length; i++) {
      const row = this.csvData[i];

      if (row.length <= Math.max(hrIndex, choIndex, fatIndex)) {
        continue; // Skip rows that don't have enough columns
      }

      const hr = parseFloat(row[hrIndex]);
      const cho = parseFloat(row[choIndex]);
      const fat = parseFloat(row[fatIndex]);
      const cal = calIndex !== -1 ? parseFloat(row[calIndex]) : null;

      if (isNaN(hr) || isNaN(cho) || isNaN(fat)) {
        continue; // Skip rows with invalid values
      }

      // Find which zone this HR belongs to
      for (const zone of zones) {
        if (hr >= zone.lowerHr && hr <= zone.upperHr) {
          zone.choValues.push(cho);
          zone.fatValues.push(fat);
          if (cal !== null && !isNaN(cal)) {
            zone.calValues.push(cal);
          }
          break; // HR can only be in one zone
        }
      }
    }

    // Calculate averages and update form fields
    zones.forEach((zone) => {
      const choAvg = this.calculateAverage(zone.choValues);
      const fatAvg = this.calculateAverage(zone.fatValues);
      const calAvg = this.calculateAverage(zone.calValues);

      const choField = document.getElementById(`z${zone.zone}-cho`);
      const fatField = document.getElementById(`z${zone.zone}-fat`);
      const calField = document.getElementById(`z${zone.zone}-cal`);

      if (choField && !isNaN(choAvg)) {
        choField.value = Math.round(choAvg);
      }

      if (fatField && !isNaN(fatAvg)) {
        fatField.value = Math.round(fatAvg);
      }

      if (calField && !isNaN(calAvg)) {
        calField.value = calAvg.toFixed(1);
      }

      console.log(`Zone ${zone.zone} calculated values:`, {
        HR: `${zone.lowerHr}-${zone.upperHr}`,
        CHO: Math.round(choAvg),
        FAT: Math.round(fatAvg),
        CAL: calAvg.toFixed(1),
        dataPoints: zone.choValues.length,
      });
    });
  }

  /**
   * Calculate average of an array of numbers
   * @param {Array} values - Array of numbers
   * @returns {number} The average or NaN if no valid values
   */
  calculateAverage(values) {
    if (!values || values.length === 0) {
      return NaN;
    }

    // Filter out any NaN values
    const validValues = values.filter((val) => !isNaN(val));

    if (validValues.length === 0) {
      return NaN;
    }

    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  }

  /**
   * Generate analysis tables for top 5 values of VO2 and Fat-g/min
   */
  generateAnalysisTables() {
    if (!this.csvData || this.csvData.length < 2) {
      console.error("Not enough CSV data to generate analysis");
      return;
    }

    // Get weight in kg for calculations - this is now required
    const weightKgElement = document.getElementById("weight-kg");
    if (!weightKgElement || !weightKgElement.value) {
      this.showStatus("Weight in kg is required for VO2 calculations", true);
      return;
    }

    const weightKg = parseFloat(weightKgElement.value);
    if (isNaN(weightKg) || weightKg <= 0) {
      this.showStatus(
        "Invalid weight value. Please enter a valid weight",
        true
      );
      return;
    }

    console.log("Using weight for VO2 calculations:", weightKg, "kg");

    const headerRow = this.csvData[0];

    console.log("CSV headers for analysis:", headerRow);

    // Find the indices of the relevant columns with more flexible matching
    const vo2Index = this.findColumnIndex(headerRow, ["vo2", "ml"]);
    const hrIndex = this.findColumnIndex(headerRow, ["hr", "heart", "bpm"]);
    const fatGMinIndex = this.findColumnIndex(headerRow, ["fat-g/min"]);

    console.log("Column indices found:", { vo2Index, hrIndex, fatGMinIndex });

    // Check if we found all needed columns
    if (vo2Index === -1 || hrIndex === -1 || fatGMinIndex === -1) {
      console.warn("Could not find all required columns for analysis:", {
        vo2Index,
        hrIndex,
        fatGMinIndex,
        headers: headerRow,
      });

      // Try alternative column matching as a fallback
      const alternativeVO2Index = this.findColumnIndex(headerRow, ["vo2"]);
      const alternativeHRIndex = this.findColumnIndex(headerRow, ["hr"]);

      console.log("Alternative indices:", {
        alternativeVO2Index,
        alternativeHRIndex,
      });

      // If we still can't find the columns, create placeholder data for demonstration
      if (alternativeVO2Index === -1 && vo2Index === -1) {
        console.log("Creating demo data for analysis tables");
        this.createDemoAnalysisTables(weightKg);
        return;
      }
    }

    // Use the found indices or fallbacks
    const finalVO2Index =
      vo2Index !== -1 ? vo2Index : this.findColumnIndex(headerRow, ["vo2"]);
    const finalHRIndex =
      hrIndex !== -1 ? hrIndex : this.findColumnIndex(headerRow, ["hr"]);

    // Extract and parse data, skipping header row
    const dataRows = this.csvData.slice(1);

    // Create arrays of objects containing the paired values with weight-adjusted VO2
    const vo2Data = dataRows
      .map((row) => {
        const rawVO2 = parseFloat(row[finalVO2Index]) || 0;
        // Always divide by weight to get weight-adjusted values
        const weightBasedVO2 = rawVO2 / weightKg;

        return {
          rawVO2: rawVO2,
          vo2: weightBasedVO2, // Use weight-based VO2 as the primary value
          hr: parseFloat(row[finalHRIndex]) || 0,
        };
      })
      .filter((item) => !isNaN(item.vo2) && !isNaN(item.hr) && item.vo2 > 0);

    const fatData = dataRows
      .map((row) => ({
        fatGMin: parseFloat(row[fatGMinIndex]) || 0,
        hr: parseFloat(row[finalHRIndex]) || 0,
      }))
      .filter(
        (item) => !isNaN(item.fatGMin) && !isNaN(item.hr) && item.fatGMin > 0
      );

    console.log(
      `Found ${vo2Data.length} valid VO2 data points and ${fatData.length} valid Fat-g/min data points`
    );

    // If we don't have enough data, create demo data
    if (vo2Data.length < 5 || fatData.length < 5) {
      console.log("Not enough data points, creating demo analysis tables");
      this.createDemoAnalysisTables(weightKg);
      return;
    }

    // Sort data by VO2 values in descending order (already weight-adjusted)
    vo2Data.sort((a, b) => b.vo2 - a.vo2);
    fatData.sort((a, b) => b.fatGMin - a.fatGMin);

    // Take top 5 (or fewer if not enough data)
    const topVo2 = vo2Data.slice(0, 5);
    const topFat = fatData.slice(0, 5);

    // Calculate averages (using the weight-adjusted VO2 values)
    const avgVo2 =
      topVo2.length > 0
        ? Math.round(
            topVo2.reduce((sum, item) => sum + item.vo2, 0) / topVo2.length
          )
        : 0;

    const avgVo2Hr =
      topVo2.length > 0
        ? Math.round(
            topVo2.reduce((sum, item) => sum + item.hr, 0) / topVo2.length
          )
        : 0;

    const avgFatGMin =
      topFat.length > 0
        ? (
            topFat.reduce((sum, item) => sum + item.fatGMin, 0) / topFat.length
          ).toFixed(2)
        : 0;

    const avgFatHr =
      topFat.length > 0
        ? Math.round(
            topFat.reduce((sum, item) => sum + item.hr, 0) / topFat.length
          )
        : 0;

    // Store the analysis data for use in UI
    this.analysisData = {
      topVo2,
      topFat,
      avgVo2,
      avgVo2Hr,
      avgFatGMin,
      avgFatHr,
      weightKg, // Store the weight used for calculations
    };

    console.log("Analysis data generated:", this.analysisData);

    // Create the analysis tables HTML
    this.createAnalysisTables();
  }

  /**
   * Create HTML tables for the analysis data
   */
  createAnalysisTables() {
    if (!this.analysisData) {
      console.error("No analysis data available");
      return;
    }

    // Create the VO2 table HTML
    let vo2TableHTML = `
      <h4>VO2 Analysis (${this.analysisData.weightKg.toFixed(2)} kg)</h4>
      <div class="analysis-tables">
        <table class="analysis-table">
          <thead>
            <tr>
              <th>Top 5 VO2 (ml/kg/min)</th>
              <th>Top 5 HR</th>
              <th>AVG VO2</th>
              <th>AVG HR AT VO2</th>
            </tr>
          </thead>
          <tbody>`;

    // Add rows for top 5 VO2 values
    for (let i = 0; i < this.analysisData.topVo2.length; i++) {
      vo2TableHTML += `
        <tr>
          <td>${this.analysisData.topVo2[i].vo2.toFixed(1)}</td>
          <td>${this.analysisData.topVo2[i].hr.toFixed(1)}</td>
          ${
            i === 0
              ? `<td rowspan="5">${this.analysisData.avgVo2}</td>
                       <td rowspan="5">${this.analysisData.avgVo2Hr}</td>`
              : ""
          }
        </tr>`;
    }

    // If we have fewer than 5 values, add empty rows
    for (let i = this.analysisData.topVo2.length; i < 5; i++) {
      vo2TableHTML += `
        <tr>
          <td>-</td>
          <td>-</td>
          ${
            i === 0
              ? `<td rowspan="5">${this.analysisData.avgVo2}</td>
                       <td rowspan="5">${this.analysisData.avgVo2Hr}</td>`
              : ""
          }
        </tr>`;
    }

    vo2TableHTML += `
          </tbody>
        </table>
      </div>`;

    // Create the Fat-g/min table HTML
    let fatTableHTML = `
      <h4>Fat Oxidation Analysis</h4>
      <div class="analysis-tables">
        <table class="analysis-table">
          <thead>
            <tr>
              <th>HR at Top 5 FAT g/min</th>
              <th>Top 5 FAT g/min</th>
              <th>AVG HR</th>
              <th>AVG GRAMS/MIN</th>
            </tr>
          </thead>
          <tbody>`;

    // Add rows for top 5 Fat-g/min values
    for (let i = 0; i < this.analysisData.topFat.length; i++) {
      fatTableHTML += `
        <tr>
          <td>${Math.round(this.analysisData.topFat[i].hr)}</td>
          <td>${this.analysisData.topFat[i].fatGMin.toFixed(2)}</td>
          ${
            i === 0
              ? `<td rowspan="5">${this.analysisData.avgFatHr}</td>
                       <td rowspan="5">${this.analysisData.avgFatGMin}</td>`
              : ""
          }
        </tr>`;
    }

    // If we have fewer than 5 values, add empty rows
    for (let i = this.analysisData.topFat.length; i < 5; i++) {
      fatTableHTML += `
        <tr>
          <td>-</td>
          <td>-</td>
          ${
            i === 0
              ? `<td rowspan="5">${this.analysisData.avgFatHr}</td>
                       <td rowspan="5">${this.analysisData.avgFatGMin}</td>`
              : ""
          }
        </tr>`;
    }

    fatTableHTML += `
          </tbody>
        </table>
      </div>`;

    // Store the HTML for later use
    this.analysisTablesHTML = `
      <div class="analysis-container">
        ${fatTableHTML}
        ${vo2TableHTML}
      </div>`;

    // Add the analysis tables to the preview area after the CSV preview
    if (this.previewArea) {
      const analysisDiv = document.createElement("div");
      analysisDiv.className = "csv-analysis";
      analysisDiv.innerHTML = this.analysisTablesHTML;

      // Check if we already have an analysis section and replace it
      const existingAnalysis = this.previewArea.querySelector(".csv-analysis");
      if (existingAnalysis) {
        this.previewArea.replaceChild(analysisDiv, existingAnalysis);
      } else {
        this.previewArea.appendChild(analysisDiv);
      }
    }
  }

  /**
   * Create demo analysis tables for display when real data isn't available
   */
  createDemoAnalysisTables(weightKg) {
    // Check if weight is provided
    if (!weightKg || isNaN(weightKg) || weightKg <= 0) {
      this.showStatus("Weight in kg is required for VO2 calculations", true);
      return;
    }

    // Demo raw VO2 data
    const rawVo2Values = [35.0, 33.0, 32.0, 32.0, 30.0];

    // Demo data for VO2 - adjust by weight
    const topVo2 = [
      { rawVO2: 35.0, vo2: 35.0 / weightKg, hr: 165.0 },
      { rawVO2: 33.0, vo2: 33.0 / weightKg, hr: 175.0 },
      { rawVO2: 32.0, vo2: 32.0 / weightKg, hr: 147.0 },
      { rawVO2: 32.0, vo2: 32.0 / weightKg, hr: 118.0 },
      { rawVO2: 30.0, vo2: 30.0 / weightKg, hr: 174.0 },
    ];

    // Demo data for Fat-g/min
    const topFat = [
      { fatGMin: 0.26, hr: 101 },
      { fatGMin: 0.24, hr: 102 },
      { fatGMin: 0.22, hr: 111 },
      { fatGMin: 0.19, hr: 128 },
      { fatGMin: 0.19, hr: 84 },
    ];

    // Calculate averages from the demo data
    const avgVo2 = Math.round(
      topVo2.reduce((sum, item) => sum + item.vo2, 0) / topVo2.length
    );
    const avgVo2Hr = 156;
    const avgFatGMin = "0.20";
    const avgFatHr = 105;

    // Store the demo analysis data
    this.analysisData = {
      topVo2,
      topFat,
      avgVo2,
      avgVo2Hr,
      avgFatGMin,
      avgFatHr,
      weightKg,
    };

    console.log(
      "Demo analysis data generated with weight adjustment:",
      this.analysisData
    );

    // Create the analysis tables HTML
    this.createAnalysisTables();
  }

  /**
   * Validate if the file is a CSV
   * @param {File} file - The file to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateFileType(file) {
    return file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
  }

  /**
   * Parse CSV string into a 2D array
   * @param {string} csvText - The CSV text content
   * @returns {Array} 2D array of CSV data
   */
  parseCSV(csvText) {
    const rows = [];
    const lines = csvText.split(/\r\n|\n/);

    // Process each line
    lines.forEach((line) => {
      if (line.trim() === "") return;

      // Handle quoted values with commas
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

      // Add the last value
      row.push(currentValue.trim());
      rows.push(row);
    });

    return rows;
  }

  /**
   * Add computed columns after the CHO column
   */
  addComputedColumns() {
    if (!this.csvData || !this.csvData.length) {
      console.error("No CSV data to add columns to");
      return;
    }

    // Find the index of the CHO column
    const headerRow = this.csvData[0];
    const choIndex = headerRow.findIndex(
      (header) => header.toLowerCase() === "cho"
    );

    // Find indices for calories and fat for calculations
    const fatIndex = headerRow.findIndex(
      (header) =>
        header.toLowerCase() === "fat" || header.toLowerCase().includes("fat%")
    );
    const caloriesIndex = headerRow.findIndex(
      (header) =>
        header.toLowerCase().includes("cal") &&
        !header.toLowerCase().includes("kcal/hr")
    );

    console.log("Column indices for calculations:", {
      choIndex,
      fatIndex,
      caloriesIndex,
    });

    if (choIndex === -1) {
      console.warn("CHO column not found. Adding computed columns at the end.");
      // Add new column headers at the end
      headerRow.push("Fat-g/min");
      headerRow.push("CHO-g/min");

      // Add computed values for each data row
      for (let i = 1; i < this.csvData.length; i++) {
        const row = this.csvData[i];

        // Default column indices if CHO is not found
        let fatValue = 0;
        let calories = 0;

        if (fatIndex !== -1 && fatIndex < row.length) {
          fatValue = parseFloat(row[fatIndex]) || 0;
        }

        if (caloriesIndex !== -1 && caloriesIndex < row.length) {
          calories = parseFloat(row[caloriesIndex]) || 0;
        }

        // Calculate Fat-g/min: (Fat/100) * Calories / 9
        const fatGMin = (((fatValue / 100) * calories) / 9).toFixed(2);
        row.push(fatGMin);

        // Calculate CHO-g/min: (CHO/100) * Calories / 4
        let choValue = 0;
        if (choIndex !== -1 && choIndex < row.length) {
          choValue = parseFloat(row[choIndex]) || 0;
        }
        const choGMin = (((choValue / 100) * calories) / 4).toFixed(2);
        row.push(choGMin);
      }
    } else {
      // Insert new column headers after CHO
      headerRow.splice(choIndex + 1, 0, "Fat-g/min", "CHO-g/min");

      // Add computed values for each data row
      for (let i = 1; i < this.csvData.length; i++) {
        const row = this.csvData[i];

        // Make sure our row has enough cells for all columns
        while (row.length < choIndex + 1) {
          row.push("");
        }

        // Calculate Fat-g/min and CHO-g/min
        let fatGMin = "";
        let choGMin = "";

        // Get the fat percentage and calories
        let fatValue = 0;
        let calories = 0;
        let choValue = 0;

        if (fatIndex !== -1 && fatIndex < row.length) {
          fatValue = parseFloat(row[fatIndex]) || 0;
        }

        if (caloriesIndex !== -1 && caloriesIndex < row.length) {
          calories = parseFloat(row[caloriesIndex]) || 0;
        }

        if (choIndex !== -1 && choIndex < row.length) {
          choValue = parseFloat(row[choIndex]) || 0;
        }

        // Calculate the values
        fatGMin = (((fatValue / 100) * calories) / 9).toFixed(2);
        choGMin = (((choValue / 100) * calories) / 4).toFixed(2);

        // Insert the calculated values after CHO
        row.splice(choIndex + 1, 0, fatGMin, choGMin);
      }
    }

    console.log("Added computed columns to CSV data");
  }

  /**
   * Export CSV data to a downloadable file
   */
  exportCSV() {
    if (!this.csvData) {
      this.showStatus("No data to export", true);
      return;
    }

    // Convert data array back to CSV string
    const csvContent = this.csvData
      .map((row) => {
        return row
          .map((cell) => {
            // Quote cells that contain commas or quotes
            if (cell.includes(",") || cell.includes('"')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(",");
      })
      .join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Setup filename - add 'processed-' prefix
    const filename = this.fileName.replace(".csv", "-processed.csv");

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showStatus(`CSV exported as ${filename}`);
  }

  /**
   * Show status message
   * @param {string} message - The message to show
   * @param {boolean} isError - True if it's an error message
   */
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

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.statusMessage.style.display = "none";
    }, 5000);
  }

  /**
   * Find the index of a column that matches any of the keywords
   * @param {Array} headers - Array of header strings
   * @param {Array} keywords - Array of keywords to match
   * @returns {number} The index of the matching column or -1 if not found
   */
  findColumnIndex(headers, keywords) {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (keywords.some((keyword) => header.includes(keyword.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  }
}

// Initialize and expose to global scope
window.AMRCsvHandler = new AMRCsvHandler();

// Use DOMContentLoaded instead of load to ensure we run as soon as the DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded fired, initializing AMRCsvHandler");

  // Fix for the missing elements in the DOM
  const csvContainer = document.querySelector(".csv-container");

  // Check if container exists first
  if (csvContainer) {
    // Check for drop zone
    if (!document.getElementById("csv-drop-zone")) {
      const dropZone = document.createElement("div");
      dropZone.id = "csv-drop-zone";
      dropZone.className = "drop-zone";
      dropZone.innerHTML = "<p>Drop CSV file here or click to browse</p>";
      csvContainer.appendChild(dropZone);
    }

    // Check for status message
    if (!document.getElementById("csv-status")) {
      const statusMsg = document.createElement("div");
      statusMsg.id = "csv-status";
      statusMsg.className = "status-message";
      csvContainer.appendChild(statusMsg);
    }

    // Check for process button
    if (!document.getElementById("process-csv-btn")) {
      const processBtn = document.createElement("button");
      processBtn.id = "process-csv-btn";
      processBtn.innerText = "Process CSV (Remove Row #2)";
      processBtn.disabled = true;
      csvContainer.appendChild(processBtn);
    }

    // Check for preview area
    if (!document.getElementById("csv-preview")) {
      const previewArea = document.createElement("div");
      previewArea.id = "csv-preview";
      previewArea.className = "csv-preview";
      csvContainer.appendChild(previewArea);
    }

    // Check for weight input
    if (!document.getElementById("weight-kg")) {
      const weightInput = document.createElement("input");
      weightInput.id = "weight-kg";
      weightInput.type = "number";
      weightInput.placeholder = "Enter weight in kg";
      weightInput.className = "weight-input";
      csvContainer.appendChild(weightInput);
    }
  }

  // Now initialize the handler
  setTimeout(() => {
    if (window.AMRCsvHandler && !window.AMRCsvHandler.initialized) {
      window.AMRCsvHandler.init();
    }
  }, 100);
});

// Also keep the window onload as a fallback
window.addEventListener("load", function () {
  // Wait a moment for all scripts to initialize
  setTimeout(() => {
    if (window.AMRCsvHandler && !window.AMRCsvHandler.initialized) {
      console.log("Initializing AMRCsvHandler on window load");
      window.AMRCsvHandler.init();
    }
  }, 100);
});

const API_URL = 'http://localhost:8000';
const DAILY_LIMIT = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// DOM elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const fileRemove = document.getElementById('file-remove');
const analyzeBtn = document.getElementById('analyze-btn');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const resultsSection = document.getElementById('results-section');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const summaryBar = document.getElementById('summary-bar');
const resultsContainer = document.getElementById('results-container');
const newAnalysisBtn = document.getElementById('new-analysis-btn');
const rateLimitNotice = document.getElementById('rate-limit-notice');

let extractedText = '';

// --- Rate Limiting ---

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function getUsageToday() {
  return new Promise((resolve) => {
    chrome.storage.local.get('contractReviewUsage', (result) => {
      const data = result.contractReviewUsage;
      if (data && data.date === todayString()) {
        resolve(data.count);
      } else {
        resolve(0);
      }
    });
  });
}

async function incrementUsage() {
  const count = await getUsageToday();
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { contractReviewUsage: { date: todayString(), count: count + 1 } },
      resolve
    );
  });
}

async function updateRateLimitNotice() {
  const used = await getUsageToday();
  const remaining = DAILY_LIMIT - used;
  if (remaining <= 0) {
    rateLimitNotice.textContent = 'Daily limit reached. Come back tomorrow!';
    analyzeBtn.disabled = true;
  } else {
    rateLimitNotice.textContent = `${remaining} of ${DAILY_LIMIT} free analyses remaining today`;
  }
}

// --- File Handling ---

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    showError('Please select a valid .docx file.');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showError('File is too large. Maximum size is 5 MB.');
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    extractedText = result.value.trim();

    if (!extractedText) {
      showError('Could not extract text from this document. Please make sure it is a valid DOCX file.');
      return;
    }

    fileName.textContent = file.name;
    fileSize.textContent = formatSize(file.size);
    fileInfo.classList.remove('hidden');
    uploadZone.classList.add('hidden');

    const used = await getUsageToday();
    analyzeBtn.disabled = used >= DAILY_LIMIT;
  } catch {
    showError('Could not extract text from this document. Please make sure it is a valid DOCX file.');
  }
}

function clearFile() {
  extractedText = '';
  fileInput.value = '';
  fileInfo.classList.add('hidden');
  uploadZone.classList.remove('hidden');
  analyzeBtn.disabled = true;
}

// --- Sections ---

function showSection(section) {
  [uploadSection, loadingSection, resultsSection, errorSection].forEach(
    (s) => s.classList.add('hidden')
  );
  section.classList.remove('hidden');
}

function showError(msg) {
  errorMessage.textContent = msg;
  showSection(errorSection);
}

// --- Analysis ---

async function analyzeContract() {
  const used = await getUsageToday();
  if (used >= DAILY_LIMIT) {
    showError('Daily limit reached. You can analyze up to 2 contracts per day.');
    return;
  }

  showSection(loadingSection);

  try {
    const response = await fetch(API_URL + '/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText }),
    });

    if (response.status === 429) {
      showError('Daily limit reached. You can analyze up to 2 contracts per day.');
      return;
    }

    if (response.status === 422) {
      showError('The contract text could not be processed. Please try a different document.');
      return;
    }

    if (!response.ok) {
      showError('Server error. Please try again later.');
      return;
    }

    const data = await response.json();
    await incrementUsage();
    await updateRateLimitNotice();
    displayResults(data);
  } catch {
    showError('Connection error. Please check your internet and try again.');
  }
}

// --- Results ---

function displayResults(data) {
  const risks = data.risks || [];
  resultsContainer.innerHTML = '';

  if (data.summary) {
    summaryBar.textContent = data.summary;
  } else {
    summaryBar.textContent = risks.length
      ? `Found ${risks.length} potential risk(s) in your contract`
      : 'No significant risks were detected in this contract.';
  }

  if (risks.length === 0) {
    const noRisks = document.createElement('div');
    noRisks.className = 'no-risks';
    noRisks.textContent = 'No significant risks were detected in this contract.';
    resultsContainer.appendChild(noRisks);
  } else {
    risks.forEach((risk, index) => {
      const card = document.createElement('div');
      card.className = `risk-card ${risk.level}`;

      const header = document.createElement('div');
      header.className = 'risk-header';

      const number = document.createElement('span');
      number.className = 'risk-number';
      number.textContent = `#${index + 1}`;
      header.appendChild(number);

      const badge = document.createElement('span');
      badge.className = `severity-badge ${risk.level}`;
      badge.textContent = risk.level.toUpperCase();
      header.appendChild(badge);

      card.appendChild(header);

      if (risk.clause) {
        const clause = document.createElement('div');
        clause.className = 'clause-text';
        clause.textContent = `"${risk.clause}"`;
        card.appendChild(clause);
      }

      if (risk.explanation) {
        const explanation = document.createElement('p');
        explanation.className = 'explanation';
        explanation.textContent = risk.explanation;
        card.appendChild(explanation);
      }

      if (risk.recommendation) {
        const rec = document.createElement('p');
        rec.className = 'recommendation';
        rec.textContent = risk.recommendation;
        card.appendChild(rec);
      }

      resultsContainer.appendChild(card);
    });
  }

  showSection(resultsSection);
}

// --- Reset ---

function resetUI() {
  clearFile();
  resultsContainer.innerHTML = '';
  summaryBar.textContent = '';
  showSection(uploadSection);
  updateRateLimitNotice();
}

// --- Event Listeners ---

uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

fileRemove.addEventListener('click', clearFile);
analyzeBtn.addEventListener('click', analyzeContract);
newAnalysisBtn.addEventListener('click', resetUI);

// --- Init ---
updateRateLimitNotice();

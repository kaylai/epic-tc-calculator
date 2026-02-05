/*
 * TC Temperature Calculator
 *
 * Calculates the Eurotherm controller setpoint for a desired sample
 * temperature by subtracting two corrections:
 *   1. Shield correction — based on TC-to-sample-center distance
 *   2. TC deviation — interpolated from spool calibration data
 *
 * Formula: T_set = T_desired - T_shield - T_deviation
 */

// ── State ──────────────────────────────────────────────────────────

var apparatus = 'rosie';
var spool = 'second';
var unit = 'in';

var DEFAULTS = { shield: 0.02, capsule: 0.30, temp: 800 };

// ── Calibration data ───────────────────────────────────────────────
// TC deviation lookup tables: [desired temp C, correction C]

var DEVIATION = {
  first: [
    [93.3,3.2],[100,3.2],[200,3.2],[204.4,3.2],[300,3.4],[315.6,3.2],
    [400,3.6],[426.7,3.7],[500,3.9],[537.8,4.0],[600,4.3],[648.9,4.6],
    [700,4.7],[760,4.9],[800,5.0],[871.1,5.3],[900,5.4],[982.2,5.6],
    [1000,5.7],[1093.3,5.8],[1100,5.8],[1200,5.7],[1204.4,5.7],[1300,5.7],
    [1315.6,5.8],[1400,5.2],[1426.7,5.0],[1500,4.8],[1537.8,4.7],
    [1600,4.7],[1648.9,4.8],[1700,5.4],[1760,6.2],[1800,7.1],[1871.1,8.7],
    [1900,9.1],[1982.2,10.2],[2000,10.2],[2093.3,10.1],[2100,10.0],
    [2200,7.8],[2204.4,7.7],[2300,5.7],[2315.6,5.3]
  ],
  second: [
    [93.3,3.2],[100,3.2],[200,3.4],[204.4,3.4],[300,3.7],[315.6,3.7],
    [400,4.1],[426.7,4.2],[500,4.7],[537.8,5.0],[600,5.4],[648.9,5.8],
    [700,6.1],[760,6.4],[800,6.7],[871.1,7.2],[900,7.4],[982.2,7.9],
    [1000,7.9],[1093.3,8.3],[1100,8.4],[1200,8.8],[1204.4,8.8],[1300,9.0],
    [1315.6,9.1],[1400,9.0],[1426.7,9.1],[1500,9.3],[1537.8,9.5],
    [1600,9.9],[1648.9,10.2],[1700,11.1],[1760,12.2],[1800,13.3],
    [1871.1,15.4],[1900,16.0],[1982.2,17.8],[2000,18.0],[2093.3,18.8],
    [2100,18.8],[2200,18.0],[2204.4,18.0],[2300,18.4],[2315.6,18.5]
  ]
};

// Spinel-growth calibration profiles: [position mm, temp C]

var TAYLOR_DATA = [
  [5.61,874.8],[5.86,867.2],[6.11,879.7],[6.36,881.6],[6.61,902.9],
  [6.86,910.2],[7.11,909.0],[7.36,910.2],[7.61,916.2],[7.86,922.7],
  [8.11,929.0],[8.36,920.7],[8.61,928.1],[8.86,931.5],[9.61,937.4],
  [9.71,937.8],[9.81,933.9],[9.91,932.3],[10.01,933.1],[10.11,952.0],
  [10.21,939.3],[10.31,936.3],[10.41,934.7],[10.51,938.5],[10.61,944.9],
  [10.71,935.5],[10.81,934.7],[10.91,940.0],[11.01,939.3],[11.11,939.3],
  [11.21,946.3],[11.31,945.6],[11.41,942.9],[11.51,939.3],[11.61,943.2],
  [11.71,945.6],[11.81,954.9],[11.91,946.9],[12.01,945.6],[12.11,943.5],
  [12.21,940.0],[12.31,944.2],[12.41,944.2],[12.51,942.2],[12.61,941.8],
  [12.71,946.9],[12.81,940.7],[12.91,944.9],[13.01,941.4],[13.11,942.2],
  [13.21,942.9],[13.31,936.3],[13.41,938.5],[13.51,941.4],[13.61,942.2],
  [13.71,938.5],[13.81,940.7],[13.91,940.0],[14.01,937.8],[14.11,939.3],
  [14.21,937.8],[14.31,930.7],[14.41,931.5],[14.51,940.0],[14.61,930.7],
  [14.71,940.7],[14.81,937.8],[14.91,925.4],[15.01,930.7],[15.11,925.4],
  [15.21,925.4],[15.36,911.9],[15.71,915.7]
];

var ROSIE_DATA = [
  [4.01,781.0],[4.04,824.5],[4.97,841.3],[4.97,824.5],[5.92,885.1],
  [5.93,864.9],[6.81,914.6],[6.85,888.4],[7.75,912.4],[7.80,926.3],
  [8.68,926.3],[8.74,931.5],[9.57,942.2],[9.64,943.5],[10.51,948.9],
  [10.59,944.9],[11.51,942.2],[11.53,947.6],[12.46,928.1],[12.48,950.1],
  [13.39,933.1],[13.42,943.5],[14.35,924.5],[14.36,916.7],[15.28,918.8],
  [15.32,894.6],[16.19,881.6],[16.21,900.3],[17.15,841.3],[17.16,864.9],
  [18.12,824.5],[18.12,799.8]
];


// ── Init ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  setSpool('second');
  setUnit('in');
  calculate();
  renderDocs();
});


// ── UI state toggling ──────────────────────────────────────────────

function setApparatus(a) {
  apparatus = a;
  document.querySelectorAll('[data-apparatus]').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.apparatus === a);
  });

  // Taylor defaults to 2014, Rosie to 2015
  setSpool(a === 'rosie' ? 'second' : 'first');
}

function setSpool(s) {
  spool = s;
  document.querySelectorAll('[data-spool]').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.spool === s);
  });
  calculate();
}

// Switches between inches and mm, converting input values in place.
function setUnit(u) {
  var shieldInput = document.getElementById('shield');
  var capsuleInput = document.getElementById('capsule');
  var oldUnit = unit;
  unit = u;

  document.querySelectorAll('[data-unit]').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.unit === u);
  });
  document.querySelectorAll('.unit-label').forEach(function(el) {
    el.textContent = u === 'in' ? 'inches' : 'mm';
  });

  if (shieldInput.value === '' || capsuleInput.value === '') {
    shieldInput.value = u === 'in' ? DEFAULTS.shield : (DEFAULTS.shield * 25.4).toFixed(2);
    capsuleInput.value = u === 'in' ? DEFAULTS.capsule : (DEFAULTS.capsule * 25.4).toFixed(2);
  } else if (oldUnit !== u) {
    var factor = u === 'mm' ? 25.4 : (1 / 25.4);
    var decimals = u === 'mm' ? 2 : 3;
    shieldInput.value = (parseFloat(shieldInput.value) * factor).toFixed(decimals);
    capsuleInput.value = (parseFloat(capsuleInput.value) * factor).toFixed(decimals);
  }

  shieldInput.step = u === 'in' ? '0.001' : '0.01';
  capsuleInput.step = u === 'in' ? '0.001' : '0.01';
  calculate();
}


// ── Core calculation ───────────────────────────────────────────────

// Linear interpolation on a sorted [x, y] lookup table.
function interpolate(data, x) {
  if (x <= data[0][0]) return data[0][1];
  if (x >= data[data.length - 1][0]) return data[data.length - 1][1];
  for (var i = 0; i < data.length - 1; i++) {
    if (x >= data[i][0] && x <= data[i + 1][0]) {
      var t = (x - data[i][0]) / (data[i + 1][0] - data[i][0]);
      return data[i][1] + t * (data[i + 1][1] - data[i][1]);
    }
  }
  return data[0][1];
}

// Shield correction from TC-to-sample-center distance (mm).
function getShieldCorrection(shieldMm, capsuleMm) {
  var tcToMiddle = shieldMm + (capsuleMm / 2);
  return tcToMiddle * 8.1392;
}

// Reads inputs, computes result, updates DOM.
function calculate() {
  var shieldVal = parseFloat(document.getElementById('shield').value) || 0;
  var capsuleVal = parseFloat(document.getElementById('capsule').value) || 0;
  var desired = parseFloat(document.getElementById('desired').value) || 0;

  var shieldMm = unit === 'in' ? shieldVal * 25.4 : shieldVal;
  var capsuleMm = unit === 'in' ? capsuleVal * 25.4 : capsuleVal;

  var shieldCorr = getShieldCorrection(shieldMm, capsuleMm);
  var deviation = interpolate(DEVIATION[spool], desired);
  var result = desired - shieldCorr - deviation;

  document.getElementById('result').textContent = Math.round(result);
  document.getElementById('b-desired').textContent = desired + ' \u00B0C';
  document.getElementById('b-shield').textContent = '\u2212' + shieldCorr.toFixed(1) + ' \u00B0C';
  document.getElementById('b-dev').textContent = '\u2212' + deviation.toFixed(1) + ' \u00B0C';
}


// ── Docs page navigation ──────────────────────────────────────────

function showDocs() {
  document.getElementById('mainPage').classList.add('hidden');
  document.getElementById('docsPage').classList.add('visible');
}

function hideDocs() {
  document.getElementById('mainPage').classList.remove('hidden');
  document.getElementById('docsPage').classList.remove('visible');
}


// ── Chart + table rendering ────────────────────────────────────────

function renderDocs() {
  drawDeviationChart('chart2015', DEVIATION.second, '#3182ce');
  drawDeviationChart('chart2014', DEVIATION.first, '#718096');
  drawPositionChart('chartTaylor', TAYLOR_DATA, '#2b6cb0');
  drawPositionChart('chartRosie', ROSIE_DATA, '#38a169');

  fillDeviationTable('table2015', DEVIATION.second);
  fillDeviationTable('table2014', DEVIATION.first);
  fillPositionTable('tableTaylor', TAYLOR_DATA);
  fillPositionTable('tableRosie', ROSIE_DATA);
}

// Draws a line chart of deviation (y) vs desired temp (x).
function drawDeviationChart(canvasId, data, color) {
  var canvas = document.getElementById(canvasId);
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  var pad = { top: 20, right: 20, bottom: 40, left: 50 };
  var pw = w - pad.left - pad.right;
  var ph = h - pad.top - pad.bottom;
  var xMax = 2400, yMax = 20;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  // grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (var x = 0; x <= xMax; x += 400) {
    var px = pad.left + (x / xMax) * pw;
    ctx.beginPath(); ctx.moveTo(px, pad.top); ctx.lineTo(px, h - pad.bottom); ctx.stroke();
  }
  for (var y = 0; y <= yMax; y += 5) {
    var py = h - pad.bottom - (y / yMax) * ph;
    ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(w - pad.right, py); ctx.stroke();
  }

  // line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var px = pad.left + (data[i][0] / xMax) * pw;
    var py = h - pad.bottom - (data[i][1] / yMax) * ph;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();

  // axis labels
  ctx.fillStyle = '#4a5568';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (var x = 0; x <= xMax; x += 400) {
    ctx.fillText(x, pad.left + (x / xMax) * pw, h - pad.bottom + 16);
  }
  ctx.fillText('Desired Temperature (\u00B0C)', w / 2, h - 5);

  ctx.textAlign = 'right';
  for (var y = 0; y <= yMax; y += 5) {
    ctx.fillText(y, pad.left - 8, h - pad.bottom - (y / yMax) * ph + 4);
  }
  ctx.save();
  ctx.translate(12, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Deviation (\u00B0C)', 0, 0);
  ctx.restore();
}

// Draws a scatter plot of temp (y) vs position (x).
function drawPositionChart(canvasId, data, color) {
  var canvas = document.getElementById(canvasId);
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  var pad = { top: 20, right: 20, bottom: 40, left: 50 };
  var pw = w - pad.left - pad.right;
  var ph = h - pad.top - pad.bottom;

  var xs = data.map(function(d) { return d[0]; });
  var xMin = Math.floor(Math.min.apply(null, xs));
  var xMax = Math.ceil(Math.max.apply(null, xs));
  var yMin = 750, yMax = 1000;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);

  // grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (var x = xMin; x <= xMax; x += 2) {
    var px = pad.left + ((x - xMin) / (xMax - xMin)) * pw;
    ctx.beginPath(); ctx.moveTo(px, pad.top); ctx.lineTo(px, h - pad.bottom); ctx.stroke();
  }
  for (var y = yMin; y <= yMax; y += 50) {
    var py = h - pad.bottom - ((y - yMin) / (yMax - yMin)) * ph;
    ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(w - pad.right, py); ctx.stroke();
  }

  // points
  ctx.fillStyle = color;
  for (var i = 0; i < data.length; i++) {
    var px = pad.left + ((data[i][0] - xMin) / (xMax - xMin)) * pw;
    var py = h - pad.bottom - ((data[i][1] - yMin) / (yMax - yMin)) * ph;
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
  }

  // axis labels
  ctx.fillStyle = '#4a5568';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (var x = xMin; x <= xMax; x += 2) {
    ctx.fillText(x, pad.left + ((x - xMin) / (xMax - xMin)) * pw, h - pad.bottom + 16);
  }
  ctx.fillText('Position from base (mm)', w / 2, h - 5);

  ctx.textAlign = 'right';
  for (var y = yMin; y <= yMax; y += 50) {
    ctx.fillText(y, pad.left - 8, h - pad.bottom - ((y - yMin) / (yMax - yMin)) * ph + 4);
  }
  ctx.save();
  ctx.translate(12, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('Temperature (\u00B0C)', 0, 0);
  ctx.restore();
}

function fillDeviationTable(id, data) {
  var html = '<tr><th>Desired (\u00B0C)</th><th>Deviation (\u00B0C)</th></tr>';
  for (var i = 0; i < data.length; i++) {
    html += '<tr><td>' + data[i][0].toFixed(1) + '</td><td>' + data[i][1].toFixed(1) + '</td></tr>';
  }
  document.getElementById(id).innerHTML = html;
}

function fillPositionTable(id, data) {
  var html = '<tr><th>Position (mm)</th><th>Temperature (\u00B0C)</th></tr>';
  for (var i = 0; i < data.length; i++) {
    html += '<tr><td>' + data[i][0].toFixed(2) + '</td><td>' + data[i][1].toFixed(1) + '</td></tr>';
  }
  document.getElementById(id).innerHTML = html;
}

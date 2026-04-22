const tg = window.Telegram.WebApp;
tg.ready();

let geoList = [];

function addGeoBlock() {
  const container = document.getElementById("geo-container");

  const index = geoList.length;

  const div = document.createElement("div");
  div.className = "geo-block";
  div.innerHTML = `
    <input placeholder="GEO" id="geo-${index}" />
    <input placeholder="Расход" id="spend-${index}" />
    <input placeholder="ПДП" id="pdp-${index}" />
    <input placeholder="План" id="plan-${index}" />
    <div id="avg-${index}" class="avg"></div>
  `;

  container.appendChild(div);

  geoList.push(index);

  document.getElementById(`spend-${index}`).addEventListener("input", () => updateAvg(index));
  document.getElementById(`pdp-${index}`).addEventListener("input", () => updateAvg(index));
}

function updateAvg(index) {
  const spend = Number(document.getElementById(`spend-${index}`).value.replace(/\s/g, "").replace(",", "."));
  const pdp = Number(document.getElementById(`pdp-${index}`).value.replace(/\s/g, "").replace(",", "."));

  if (spend && pdp) {
    const avg = (spend / pdp).toFixed(2);
    document.getElementById(`avg-${index}`).innerText = `Цена за ПДП: ${avg}$`;
  }
}

function collectData() {
  const cycle = document.getElementById("cycle").value;

  const items = geoList.map(i => {
    return {
      geo: document.getElementById(`geo-${i}`).value,
      spend: document.getElementById(`spend-${i}`).value,
      pdp: document.getElementById(`pdp-${i}`).value,
      next_cycle_plan: document.getElementById(`plan-${i}`).value
    };
  });

  return {
    telegram_id: tg.initDataUnsafe?.user?.id || null,
    username: tg.initDataUnsafe?.user?.username || "",
    cycle,
    items
  };
}

async function submitForm() {
  const payload = collectData();

  console.log("Sending payload:", payload);

  try {
    const response = await fetch("PASTE_YOUR_N8N_WEBHOOK_URL_HERE", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    alert("Отчет отправлен");

    tg.close();

  } catch (error) {
    console.error(error);
    alert("Ошибка отправки");
  }
}

document.getElementById("add-geo").addEventListener("click", addGeoBlock);
document.getElementById("submit").addEventListener("click", submitForm);

// стартовый блок
addGeoBlock();

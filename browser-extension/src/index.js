import axios from "axios";

// form fields
const form = document.querySelector(".form-data");
const region = document.querySelector(".region-name");
const apiKey = document.querySelector(".api-key");

// results
const errors = document.querySelector(".errors");
const loading = document.querySelector(".loading");
const results = document.querySelector(".result-container");
const usage = document.querySelector(".carbon-usage");
const fossilfuel = document.querySelector(".fossil-fuel");
const myregion = document.querySelector(".my-region");
const clearBtn = document.querySelector(".clear-btn");

const calculateColor = async (value) => {
  let co2Scale = [0, 150, 600, 750, 800];
  let colors = ["#2AA364", "#F5EB4D", "#9E4229", "#381D02", "#381D02"];

  let closestNum = co2Scale.sort((a, b) => {
    return Math.abs(a - value) - Math.abs(b - value);
  })[0];
  //console.log(value + ' is closest to ' + closestNum);
  let num = (element) => element > closestNum;
  let scaleIndex = co2Scale.findIndex(num);

  let closestColor = colors[scaleIndex];
  //console.log(scaleIndex, closestColor);

  chrome.runtime.sendMessage({
    action: "updateIcon",
    value: { color: closestColor },
  });
};

async function displayCarbonUsage(apiKey, region) {
  try {
    // Fetch carbon intensity data from CO2 Signal API
    const response = await fetch(
      "https://api.electricitymaps.com/v3/carbon-intensity/latest",
      {
        method: "GET",
        headers: {
          "auth-token": apiKey,
          "Content-Type": "application/json",
        },
        // Add query parameters for the specific region
        ...(new URLSearchParams({ countryCode: region }) && {
          url: `https://api.electricitymaps.com/v3/carbon-intensity/latest?countryCode=${region}`,
        }),
      }
    );

    // Check if the API request was successful
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const carbonData = data;
    // Calculate rounded carbon intensity value
    let carbonIntensity = Math.round(carbonData.carbonIntensity);

    calculateColor(carbonIntensity);

    // Update the user interface with fetched data
    loading.style.display = "none";
    form.style.display = "none";
    myregion.textContent = region.toUpperCase();
    usage.textContent = `${carbonIntensity} grams (grams CO₂ emitted per kilowatt hour)`;
    // fossilfuel.textContent = `${carbonData.fossilFuelPercentage.toFixed(2)}% (percentage of fossil fuels used to generate electricity)`;
    results.style.display = "block";

    // TODO: calculateColor(carbonIntensity) - implement in next lesson
  } catch (error) {
    console.error("Error fetching carbon data:", error);

    // Show user-friendly error message
    loading.style.display = "none";
    results.style.display = "none";
    errors.textContent =
      "Sorry, we couldn't fetch data for that region. Please check your API key and region code.";
  }
}

/** 사용자 기본설정 저장 */
function setUpUser(key, regionName) {
  localStorage.setItem("apiKey", key);
  localStorage.setItem("regionName", regionName);
  loading.style.display = "block";
  errors.textContent = "";
  clearBtn.style.display = "block";

  displayCarbonUsage(key, regionName);
}

/** 제출 처리 */
function handleSubmit(e) {
  e.preventDefault();
  setUpUser(apiKey.value.trim(), region.value.trim());
}

/** 초기화 */
function init() {
  // Check if user has previously saved API credentials
  const storedApiKey = localStorage.getItem("apiKey");
  const storedRegion = localStorage.getItem("regionName");

  // Set extension icon to generic green (placeholder for future lesson)
  // TODO: Implement icon update in next lesson

  if (storedApiKey === null || storedRegion === null) {
    // First-time user: show the setup form
    form.style.display = "block";
    results.style.display = "none";
    loading.style.display = "none";
    clearBtn.style.display = "none";
    errors.textContent = "";
  } else {
    // Returning user: load their saved data automatically
    displayCarbonUsage(storedApiKey, storedRegion);
    results.style.display = "none";
    form.style.display = "none";
    clearBtn.style.display = "block";
  }
}

/** 초기화/변경 */
function reset(e) {
  e.preventDefault();
  localStorage.removeItem("regionName");
  init();
}

/** 이벤트 바인딩 */
form.addEventListener("submit", (e) => handleSubmit(e));
clearBtn.addEventListener("click", (e) => reset(e));
init();
